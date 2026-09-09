import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const projects = await prisma.project.findMany({ take:5, orderBy:{updatedAt:'desc'}, select:{id:true,name:true,_count:{select:{estimates:true}}} });
projects.forEach(p => console.log(p.id, p.name, p._count.estimates));
await prisma.$disconnect();
