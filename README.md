# Secure Study Hub Backend

Custom backend API for Secure Study Hub using Express + TypeScript + Prisma + PostgreSQL.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` values into `.env` (already created) and adjust as needed.

Required variables:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`

Optional for slide uploads and signed URLs:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Lecture slides are stored in private Supabase Storage buckets and delivered through signed URLs.

## 3. Start PostgreSQL (optional with Docker)

```bash
docker compose up -d
```

## 4. Create first migration

```bash
npm run prisma:migrate -- --name init
npm run prisma:generate
```

## 5. Run backend in development

```bash
npm run dev
```

Backend base URL:

- `http://localhost:4000`
- health check: `GET /api/health`

## Available endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`

## Suggested next backend modules

- Subjects
- Lectures
- Purchases / enrollments
- Admin content management
- File upload and secure viewer token endpoints
