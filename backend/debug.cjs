const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const project = await prisma.project.findFirst({
    include: {
      requirements: {
        include: {
          gaps: {
            include: {
              questions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
  console.log(JSON.stringify(project, null, 2));
}
main().finally(() => prisma.$disconnect());
