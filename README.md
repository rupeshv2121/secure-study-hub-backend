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

## Deploying on Vercel

Deploy the backend as its own Vercel project with the project root set to `secure-study-hub-backend`.

Set these environment variables in Vercel:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN` with your frontend Vercel URL, or a comma-separated list of allowed origins
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` if slide upload and signed URL features are enabled
- `GOOGLE_SERVICE_ACCOUNT_JSON` if Google Drive integration is enabled

The upload route uses ephemeral storage under `/tmp` on Vercel, so uploaded files are only temporary before being pushed to Supabase Storage.

## Deploying on Render

Deploy the backend as a Render web service with the project root set to `secure-study-hub-backend`.

Use these settings:

- Build command: `npm install --include=dev && npm run prisma:generate && npm run build`
- Pre-deploy command: `npm run prisma:deploy`
- Start command: `npm start`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GOOGLE_SERVICE_ACCOUNT_JSON` if needed
- Do not hardcode `PORT` on Render; let the platform inject the port for the web service

The included [render.yaml](render.yaml) sets the same build, pre-deploy, and start commands so Render does not fall back to `npm install` alone.

## Available endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`

## Suggested next backend modules

- Subjects
- Lectures
- Purchases / enrollments
- Admin content management
- File upload and secure viewer token endpoints
