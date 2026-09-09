import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.create({
    data: {
      name: "Mock PDF Test",
      description: "Testing PDF",
      status: "DRAFT",
      user: {
        connect: { id: "cmtlbu2fx0000pkv3j4c537kp" } // tester user
      }
    }
  });

  const estimate = await prisma.estimate.create({
    data: {
      projectId: project.id,
      version: 1,
      totalHours: 120,
      items: {
        create: [
          { moduleName: "Auth", featureName: "Login", hours: 40, ruleId: "r1" },
          { moduleName: "Auth", featureName: "Register", hours: 40, ruleId: "r2" },
          { moduleName: "Core", featureName: "Dashboard", hours: 40, ruleId: "r3" },
        ]
      }
    }
  });

  console.log(`Created project ${project.id} with estimate ${estimate.id}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
