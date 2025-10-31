import axios from 'axios';
import { loadStoredAuth } from './authStorage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const stored = loadStoredAuth();
  if (stored?.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${stored.accessToken}`;
  }
  return config;
});

export function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

export interface CalendarAccount {
  id: string;
  provider: 'google' | 'apple';
  label?: string | null;
  email?: string | null;
  lastSyncedAt?: string | null;
}

export async function getCalendarAccounts(userId: string) {
  const { data } = await api.get<{ data: CalendarAccount[] }>('/calendar/accounts', { params: { userId } });
  return data.data;
}

export async function createGoogleAuthLink(userId: string, redirectUri: string) {
  const { data } = await api.post<{ url: string }>('/calendar/google/authorize', { userId, redirectUri });
  return data.url;
}

export async function completeGoogleConnection(payload: { userId: string; code: string; redirectUri: string }) {
  const { data } = await api.post('/calendar/google/callback', payload);
  return data.account;
}

export async function connectAppleCalendar(payload: { userId: string; email: string; appSpecificPassword: string; principalUrl?: string }) {
  const { data } = await api.post('/calendar/apple/connect', payload);
  return data.account;
}

export async function triggerCalendarSync(accountId: string) {
  await api.post('/calendar/accounts/sync', { accountId });
}

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
  holiday?: { id: string; name: string; date: string } | null;
  calories?: number;
  macros?: Record<string, number> | null;
  courses: Record<string, MealCourseItem[]>;
  source: 'template' | 'override';
}

export async function fetchDailyMealPlan(userId: string, date?: string) {
  const { data } = await api.get<{ data: MealPlanPayload }>('/meal-plans/daily', { params: { userId, date } });
  return data.data;
}

export async function fetchUpcomingMealPlans(userId: string, days: number = 7) {
  const { data } = await api.get<{ data: MealPlanPayload[] }>('/meal-plans/upcoming', { params: { userId, days } });
  return data.data;
}

export async function saveMealOverride(payload: { userId: string; dateKey: string; courses: Record<string, MealCourseItem[]>; holidayId?: string | null; calories?: number; macros?: Record<string, number> | null; notes?: string | null; }) {
  const { data } = await api.post('/meal-plans/override', payload);
  return data.data;
}
