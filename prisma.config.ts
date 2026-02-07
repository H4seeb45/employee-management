import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    // Use staging database when in development, production otherwise
    url: process.env.NODE_ENV === 'development' && process.env.DATABASE_URL_STAGING
      ? env("DATABASE_URL_STAGING")
      : env("DATABASE_URL"),
  },
});
