# Database Commands Reference

This project is configured to use **staging database** when running on localhost/development, and **production database** when deployed.

## Environment Variables

- `DATABASE_URL` - Production database
- `DATABASE_URL_STAGING` - Staging database (used in development)

## NPM Scripts

### Database Push (Schema Sync)

```bash
# Push schema to STAGING database (localhost/development)
npm run db:push:staging

# Push schema to PRODUCTION database
npm run db:push:prod
```

### Database Seeding

```bash
# Seed STAGING database
npm run db:seed:staging

# Seed PRODUCTION database
npm run db:seed:prod
```

### Prisma Studio (Database GUI)

```bash
# Open Prisma Studio for STAGING database
npm run prisma:studio:staging

# Open Prisma Studio for PRODUCTION database
npm run prisma:studio:prod
```

### Generate Prisma Client

```bash
npm run prisma:generate
```

## How It Works

The application automatically detects the environment:

- **Development** (`NODE_ENV=development` or running on localhost):
  - Uses `DATABASE_URL_STAGING`
  - Automatically applied when running `npm run dev`
  
- **Production** (`NODE_ENV=production`):
  - Uses `DATABASE_URL`
  - Automatically applied when deployed

## Manual Commands (PowerShell)

If you need to run Prisma commands manually:

```powershell
# For STAGING
$env:NODE_ENV='development'; npx prisma db push

# For PRODUCTION
$env:NODE_ENV='production'; npx prisma db push
```

## ⚠️ Important Notes

1. **Always use the npm scripts** to avoid accidentally pushing to the wrong database
2. The `npm run dev` command automatically uses the staging database
3. When deployed, the production database is automatically used
4. Double-check which database you're targeting before running destructive operations
