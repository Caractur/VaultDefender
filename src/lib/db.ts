import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isPostgresUrl(url: string) {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }
  if (!isPostgresUrl(connectionString)) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string. Replace the old SQLite value with your Neon pooled URL."
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
