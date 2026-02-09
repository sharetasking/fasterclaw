import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client configuration
 *
 * For optimal connection pool settings during concurrent operations,
 * add these parameters to your DATABASE_URL:
 *
 * - connection_limit=25 (increase pool size from default 2-5)
 * - pool_timeout=30 (seconds to wait for available connection)
 * - connect_timeout=30 (seconds to establish new connection)
 *
 * Example: postgresql://user:pass@host:5432/db?connection_limit=25&pool_timeout=30
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
