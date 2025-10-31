# Personal Fortress — MVP scaffold

This repository (my-house) holds a minimal full-stack scaffold for the "Personal Fortress" MVP with a Backend and Frontend.

Backend (Express + TypeScript + Prisma)
- Run: cd Backend && npm install && copy .env.example .env && npx prisma generate && npm run dev

Frontend (Vite + React + TypeScript)
- Run: cd Frontend && npm install && npm run dev

Notes:
- The notification worker logs messages rather than calling FCM in development.
- You should set up a Postgres database and Redis for full functionality. See `Backend/.env.example`.

Small repo name: `my-house` — the repository used for the Personal Fortress project.
