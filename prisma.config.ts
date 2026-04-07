import "dotenv/config";
import { defineConfig } from "prisma/config";

function isPostgresUrl(url: string) {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

function getDatasourceUrl() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Set DIRECT_URL or DATABASE_URL before running Prisma commands."
    );
  }
  if (!isPostgresUrl(url)) {
    throw new Error(
      "DIRECT_URL or DATABASE_URL must be a PostgreSQL connection string. Replace the old SQLite value with your Neon URL."
    );
  }

  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatasourceUrl(),
  },
});
