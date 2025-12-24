import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const adapter = process.env.DATABASE_URL
  ? new PrismaPg({ connectionString: process.env.DATABASE_URL.trim() })
  : undefined;
const dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : "";

export const prisma =
  global.prisma || (dbUrl ? new PrismaClient({ adapter }) : new PrismaClient());

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
