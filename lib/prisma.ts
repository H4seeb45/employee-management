import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Use staging database when on localhost, production otherwise
const isLocalhost = typeof window !== 'undefined' 
  ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  : process.env.NODE_ENV === 'development';

const databaseUrl = isLocalhost && process.env.DATABASE_URL_STAGING
  ? process.env.DATABASE_URL_STAGING.trim()
  : process.env.DATABASE_URL?.trim() || "";

const adapter = databaseUrl
  ? new PrismaPg({ connectionString: databaseUrl })
  : undefined;
const dbUrl = databaseUrl;

export const prisma =
  global.prisma || (dbUrl ? new PrismaClient({ adapter }) : new PrismaClient());

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
