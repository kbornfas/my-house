# Architecture adjustments — Personal Fortress

This file documents the changes discovered and applied while scaffolding the MVP and aligns the original architecture with the current codebase.

Key changes applied

- Device model: Replaced single `fcm_token` on `users` with a `Device` model (per-device tokens). This enables multi-device support and token lifecycle management.
- Queue-based notifications: Implemented a BullMQ-based notification queue (`notificationQueue`) and a worker scaffold. Added a cron-based `reminderScheduler` that enqueues due reminders into the queue. This provides retries, DLQ, and backoff support.
- NotificationLog improvements: `attemptCount` and `lastError` fields were added to support troubleshooting.
- Color metadata: Added `color` fields to `Bill`, `ShoppingItem`, and `Reminder` models in Prisma to support the UI color coding described in the design system.
- Refresh tokens: Added `RefreshToken` model and a simple refresh endpoint with token rotation (scaffold) to support session management.

Remaining work / roadmap

- Secure JWT strategy (RS256 + key rotation) and full refresh-token cookie storage (httpOnly) — currently scaffolded with a basic rotation.
- Send push via Firebase Admin in worker and handle FCM responses to cleanup invalid tokens.
- Add Zod validation to all routes (done for auth/bills/reminders), and protect routes with authentication middleware.
- Add automated migrations and CI to run `prisma migrate deploy` and tests on pull requests.
