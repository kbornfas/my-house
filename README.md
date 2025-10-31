# Personal Fortress — MVP scaffold

This repository (my-house) holds a minimal full-stack scaffold for the "Personal Fortress" MVP with a Backend and Frontend.

Backend (Express + TypeScript + Prisma)
- Run: cd Backend && npm install && copy .env.example .env && npx prisma generate && npm run dev

Frontend (Vite + React + TypeScript)
- Run: cd Frontend && npm install && npm run dev

Notes:
- The notification worker logs messages rather than calling FCM in development.
- You should set up a Postgres database and Redis for full functionality. See `Backend/.env.example`.
- Calendar + Meal Planner features require extra secrets:
	- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` from Google Cloud Console (OAuth consent screen set to External, scopes: Calendar read-only, profile, email).
	- `GOOGLE_REDIRECT_URI` should match the URL the frontend will redirect back to (e.g. `http://localhost:5173/meal-planner`).
	- `TOKEN_ENCRYPTION_KEY` must be a 32+ character secret used to encrypt calendar tokens.
	- `CALENDARIFIC_API_KEY` from https://calendarific.com/ for holiday data.
	- `SPOONACULAR_API_KEY` (or compatible Spoonacular proxy) for daily meal generation.
	- Apple Calendar connection relies on user-provided Apple ID email and app-specific password (captured in the UI).
- New wellness dashboard available at `/meal-planner` once the frontend is running. It supports Google/Apple calendar connections, shows upcoming holiday-aware meal plans, and lets you override courses per day.

Small repo name: `my-house` — the repository used for the Personal Fortress project.
