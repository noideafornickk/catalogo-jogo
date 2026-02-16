import { PrismaClient } from "@prisma/client";

declare global {
  var __gameboxPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__gameboxPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__gameboxPrisma = prisma;
}
