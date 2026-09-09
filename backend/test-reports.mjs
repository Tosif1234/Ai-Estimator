import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();

async function run() {
  const project = await prisma.project.findFirst({
      where: { name: 'PDF Test Project' },
      orderBy: { createdAt: 'desc' },
      include: { owner: true }
  });
  
  if (!project) {
      console.log("Project not found");
      return;
  }
  console.log("Found project", project.id);

  // Inject Estimate
  await prisma.estimate.create({
      data: {
          projectId: project.id,
          version: 1,
          totalHours: 120,
          totalCost: 12000,
          assumptions: ['Testing assumptions'],
          timelineWeeks: 4,
          teamSize: 2,
          modules: [
              {
                  name: "Auth",
                  hours: 40,
                  features: [{ name: "Login", hours: 20 }, { name: "Register", hours: 20 }]
              },
              {
                  name: "Dashboard",
                  hours: 80,
                  features: [{ name: "View Profile", hours: 40 }, { name: "Edit Profile", hours: 40 }]
              }
          ]
      }
  });
  
  console.log("Estimate injected!");
  
  // Need to log in again to get token
  const loginReq = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
  }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
          const token = JSON.parse(data).accessToken;
          console.log("Got token");
          
          const formats = ['pdf', 'excel', 'word', 'csv'];
          for (const format of formats) {
              const req2 = http.request({
                  hostname: 'localhost',
                  port: 3001,
                  path: `/projects/${project.id}/reports/${format}`,
                  method: 'GET',
                  headers: { 'Authorization': `Bearer ${token}` }
              }, (res2) => {
                  let buf = Buffer.from([]);
                  res2.on('data', chunk => buf = Buffer.concat([buf, chunk]));
                  res2.on('end', () => {
                      console.log(`Format: ${format.toUpperCase()} -> Status: ${res2.statusCode}, Size: ${buf.length}, Content-Type: ${res2.headers['content-type']}`);
                  });
              });
              req2.end();
          }
      });
  });
  loginReq.write(JSON.stringify({ email: project.owner.email, password: "Password123!" }));
  loginReq.end();
}

run().catch(console.error).finally(() => prisma.$disconnect());
