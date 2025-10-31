import { Holiday, MealPlanTemplate, Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

const SPOONACULAR_BASE = 'https://api.spoonacular.com';
const DEFAULT_CALORIES = 2000;

export interface MealCourseItem {
  id: number;
  title: string;
  readyInMinutes?: number;
  servings?: number;
  image?: string;
  sourceUrl?: string;
  summary?: string;
  nutrients?: Record<string, number>;
}

export interface MealPlanPayload {
  dateKey: string;
  isHoliday: boolean;
  holiday?: { id: string; name: string; date: Date } | null;
  calories?: number;
  macros?: Record<string, number> | null;
  courses: Record<string, MealCourseItem[]>;
  source: 'template' | 'override';
}

interface GenerateOptions {
  calories?: number;
  tags?: string[];
  type: 'standard' | 'holiday';
}

function deserializeCourseMap(value: Prisma.JsonValue | null): Record<string, MealCourseItem[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as unknown as Record<string, MealCourseItem[]>;
}

function serializeCourseMap(value: Record<string, MealCourseItem[]>): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function normalizeCourses(input: MealCourseItem[] | Record<string, MealCourseItem[]>): Record<string, MealCourseItem[]> {
  if (Array.isArray(input)) {
    return { custom: input };
  }
  return input;
}

export async function getMealPlanForDate(userId: string, targetDate: Date, holiday?: Holiday | null): Promise<MealPlanPayload> {
  const isoDate = DateTime.fromJSDate(targetDate).toISODate();
  const fallback = DateTime.fromJSDate(targetDate).toFormat('yyyy-LL-dd');
  const dateKey = isoDate ?? fallback;
  const isHoliday = Boolean(holiday);

  const override = await prisma.userMealOverride.findFirst({
    where: {
      userId,
      dateKey,
      holidayId: holiday ? holiday.id : null,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (override) {
    return {
      dateKey,
      isHoliday,
      holiday: holiday ? { id: holiday.id, name: holiday.name, date: holiday.date } : null,
      calories: override.calories ?? undefined,
      macros: (override.macros as Record<string, number> | null) ?? null,
      courses: deserializeCourseMap(override.courses),
      source: 'override',
    };
  }

  let template = await prisma.mealPlanTemplate.findUnique({ where: { dateKey_type: { dateKey, type: isHoliday ? 'holiday' : 'standard' } } });
  if (!template) {
    template = await generateTemplate(dateKey, { type: isHoliday ? 'holiday' : 'standard', calories: holiday ? DEFAULT_CALORIES + 300 : DEFAULT_CALORIES });
  }

  return {
    dateKey,
    isHoliday,
    holiday: holiday ? { id: holiday.id, name: holiday.name, date: holiday.date } : null,
    calories: template.calories ?? undefined,
    macros: template.macros as Record<string, number> | null,
    courses: deserializeCourseMap(template.courses),
    source: 'template',
  };
}

export async function upsertUserMealOverride(userId: string, dateKey: string, data: { holidayId?: string | null; courses: MealCourseItem[] | Record<string, MealCourseItem[]>; calories?: number; macros?: Record<string, number> | null; notes?: string | null; }) {
  const normalizedCourses = normalizeCourses(data.courses);
  const macrosValue = data.macros !== undefined ? (data.macros ?? Prisma.JsonNull) : undefined;
  const existing = await prisma.userMealOverride.findFirst({
    where: {
      userId,
      dateKey,
      holidayId: data.holidayId ?? null,
    },
  });

  if (existing) {
    return prisma.userMealOverride.update({
      where: { id: existing.id },
      data: {
        courses: serializeCourseMap(normalizedCourses),
        calories: data.calories ?? undefined,
        macros: macrosValue,
        notes: data.notes ?? undefined,
        holidayId: data.holidayId ?? null,
      },
    });
  }

  return prisma.userMealOverride.create({
    data: {
      userId,
      dateKey,
      holidayId: data.holidayId ?? null,
      courses: serializeCourseMap(normalizedCourses),
      calories: data.calories ?? undefined,
      macros: data.macros ?? undefined,
      notes: data.notes ?? undefined,
    },
  });
}

async function generateTemplate(dateKey: string, options: GenerateOptions): Promise<MealPlanTemplate> {
  const calories = options.calories ?? DEFAULT_CALORIES;
  const plan = await fetchPlanFromApi({ calories, tags: options.tags, type: options.type });
  return prisma.mealPlanTemplate.create({
    data: {
      dateKey,
      type: options.type,
      calories: plan.calories,
      macros: plan.macros ? (plan.macros as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      courses: serializeCourseMap(plan.courses),
    },
  });
}

async function fetchPlanFromApi(options: { calories: number; tags?: string[] | null; type: 'standard' | 'holiday'; }) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    throw new Error('SPOONACULAR_API_KEY is not configured');
  }

  const params: Record<string, string> = {
    apiKey,
    timeFrame: 'day',
    targetCalories: String(options.calories),
  };
  if (options.tags?.length) {
    params.tags = options.tags.join(',');
  }

  const { data } = await axios.get(`${SPOONACULAR_BASE}/mealplanner/generate`, { params });
  const meals = data.meals as Array<{ id: number; title: string; readyInMinutes: number; servings: number; sourceUrl: string }>;
  const nutrients = data.nutrients as Record<string, number>;

  const detailedMeals: MealCourseItem[] = [];
  for (const meal of meals) {
    detailedMeals.push(await enrichMeal(meal.id));
  }

  const courses: Record<string, MealCourseItem[]> = {
    breakfast: detailedMeals[0] ? [detailedMeals[0]] : [],
    lunch: detailedMeals[1] ? [detailedMeals[1]] : [],
    dinner: detailedMeals[2] ? [detailedMeals[2]] : [],
    snacks: [],
  };

  if (options.type === 'holiday' && detailedMeals[2]) {
    courses.dessert = [await buildHolidayDessertSuggestion(options.calories)];
  }

  return {
    calories: nutrients?.calories ?? options.calories,
    macros: {
      protein: nutrients?.protein ?? 0,
      fat: nutrients?.fat ?? 0,
      carbohydrates: nutrients?.carbohydrates ?? 0,
    },
    courses,
  };
}

async function enrichMeal(id: number): Promise<MealCourseItem> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    throw new Error('SPOONACULAR_API_KEY is not configured');
  }
  const { data } = await axios.get(`${SPOONACULAR_BASE}/recipes/${id}/information`, { params: { apiKey, includeNutrition: true } });
  const nutrientsMap: Record<string, number> = {};
  if (Array.isArray(data.nutrition?.nutrients)) {
    for (const nutrient of data.nutrition.nutrients) {
      nutrientsMap[nutrient.name] = nutrient.amount;
    }
  }
  return {
    id,
    title: data.title,
    readyInMinutes: data.readyInMinutes,
    servings: data.servings,
    image: data.image,
    sourceUrl: data.sourceUrl,
    summary: data.summary,
    nutrients: nutrientsMap,
  };
}

async function buildHolidayDessertSuggestion(calories: number): Promise<MealCourseItem> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) {
    throw new Error('SPOONACULAR_API_KEY is not configured');
  }
  const { data } = await axios.get(`${SPOONACULAR_BASE}/recipes/random`, {
    params: { apiKey, number: 1, tags: 'dessert,holiday' },
  });
  const recipe = data.recipes?.[0];
  if (!recipe) {
    return {
      id: 0,
      title: 'Seasonal Fruit Plate',
      summary: 'Light dessert of seasonal fruits with yogurt dip.',
      nutrients: { calories: Math.round(calories * 0.1) },
    };
  }
  return {
    id: recipe.id,
    title: recipe.title,
    readyInMinutes: recipe.readyInMinutes,
    image: recipe.image,
    sourceUrl: recipe.sourceUrl,
    summary: recipe.summary,
    nutrients: Array.isArray(recipe.nutrition?.nutrients)
      ? Object.fromEntries(recipe.nutrition.nutrients.map((n: { name: string; amount: number }) => [n.name, n.amount]))
      : undefined,
  };
}

export async function listUpcomingMealPlans(userId: string, days: number) {
  const start = DateTime.utc().startOf('day');
  const payloads: MealPlanPayload[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = start.plus({ days: i }).toJSDate();
    const holiday = await findHolidayForDate(userId, date);
    payloads.push(await getMealPlanForDate(userId, date, holiday));
  }
  return payloads;
}

export async function findHolidayForDate(userId: string, date: Date) {
  const countryCode = await resolveUserCountry(userId);
  const start = DateTime.fromJSDate(date).startOf('day');
  const end = start.endOf('day');
  const holiday = await prisma.holiday.findFirst({
    where: {
      countryCode,
      date: {
        gte: start.toJSDate(),
        lte: end.toJSDate(),
      },
    },
  });
  return holiday;
}

async function resolveUserCountry(userId: string) {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const locale = prefs?.locale ?? 'en-US';
  const country = locale.split('-')[1]?.toUpperCase() ?? 'US';
  return country;
}

export async function ensureUserPreferences(userId: string) {
  return prisma.userPreferences.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
