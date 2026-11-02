import '../scripts/load-env.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const url = new URL(connectionString);

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL.');
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 3000,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.systemInfo.upsert({
      where: { key: 'bootstrap' },
      update: {},
      create: {
        key: 'bootstrap',
        value: 'initialized',
      },
    });

    console.log('Seed completed: bootstrap record is present.');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch(() => {
  console.error('Seed failed. Check database connectivity and migrations.');
  process.exitCode = 1;
});
