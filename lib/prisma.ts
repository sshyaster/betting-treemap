import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  if (!connectionString) {
    // Return a mock-like client that will throw on actual DB calls
    // This allows the app to build without a database configured
    return new PrismaClient({ adapter: new PrismaPg(connectionString as unknown as string) });
  }
  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
