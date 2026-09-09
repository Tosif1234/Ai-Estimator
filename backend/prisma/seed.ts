import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

const rules = [
  {
    featureName: 'Authentication',
    category: 'User Management',
    complexity: 'MEDIUM',
    baseHours: 12,
    aliases: [
      'authentication',
      'login',
      'user login',
      'sign in',
    ],
  },
  {
    featureName: 'User Management',
    category: 'Administration',
    complexity: 'MEDIUM',
    baseHours: 16,
    aliases: [
      'user management',
      'manage users',
      'user administration',
      'user management system',
    ],
  },
  {
    featureName: 'Course Upload',
    category: 'Course Management',
    complexity: 'MEDIUM',
    baseHours: 16,
    aliases: [
      'course upload',
      'upload courses',
      'create course',
      'course creation',
    ],
  },
  {
    featureName: 'Video Hosting',
    category: 'Course Management',
    complexity: 'HIGH',
    baseHours: 24,
    aliases: [
      'video hosting',
      'host videos',
      'video storage',
      'video upload',
    ],
  },
  {
    featureName: 'Course Purchase',
    category: 'E-commerce',
    complexity: 'HIGH',
    baseHours: 20,
    aliases: [
      'course purchase',
      'buy courses',
      'purchase courses',
      'course payment',
    ],
  },
  {
    featureName: 'Quizzes',
    category: 'Assessment',
    complexity: 'MEDIUM',
    baseHours: 12,
    aliases: [
      'quizzes',
      'quiz',
      'online quiz',
      'assessments',
    ],
  },
  {
    featureName: 'Certificate Generation',
    category: 'Certification',
    complexity: 'MEDIUM',
    baseHours: 10,
    aliases: [
      'certificate generation',
      'generate certificates',
      'course certificate',
      'certificates',
    ],
  },
];

async function main() {
  for (const rule of rules) {
    await prisma.estimationRule.upsert({
      where: {
        featureName: rule.featureName,
      },
      update: {
        category: rule.category,
        complexity: rule.complexity,
        baseHours: rule.baseHours,
        aliases: rule.aliases,
      },
      create: rule,
    });
  }

  console.log('✅ Estimation rules seeded successfully.');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });