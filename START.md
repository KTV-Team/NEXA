# Chạy NEXA local

Mở PowerShell tại thư mục repo.

**Lần đầu:**

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
notepad apps/api/.env
```

Trong `.env`, điền `DB_PASSWORD`, đặt `ALLOW_DEV_SEED=true` và `DEV_SEED_PASSWORD`.

**Mỗi lần chạy:**

```powershell
docker compose --env-file apps/api/.env up -d postgres
pnpm --filter @nexa/api db:migration:run
pnpm --filter @nexa/api db:seed
pnpm dev
```

Mở Web tại http://localhost:3000. Expo hiển thị hướng dẫn mở Mobile. Dừng app bằng `Ctrl+C`; dừng database bằng:

```powershell
docker compose --env-file apps/api/.env stop postgres
```
