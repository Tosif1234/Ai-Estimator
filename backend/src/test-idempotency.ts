import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { QuestionsService } from './requirements/questions/questions.service.js';
import { GapAnalysisService } from './requirements/gap-analysis/gap-analysis.service.js';

async function test() {
  console.log('Bootstrapping app context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const qs = app.get(QuestionsService);
  const gs = app.get(GapAnalysisService);
  const projectId = 'cmtlenagw0000d4v3kywzf94l';

  console.log('--- TEST 1: Generate Questions ---');
  const r1 = await qs.generateQuestions(projectId);
  console.log(`Generated ${r1.questions.length} new questions.`);

  console.log('--- TEST 2: Generate Questions Again ---');
  const r2 = await qs.generateQuestions(projectId);
  console.log(`Generated ${r2.questions.length} new questions.`);

  console.log('--- TEST 3: Gap Analysis ---');
  const g1 = await gs.analyzeGaps(projectId);
  console.log(`Gaps count: ${g1.gaps.length}`);

  console.log('--- TEST 4: Gap Analysis Again ---');
  const g2 = await gs.analyzeGaps(projectId);
  console.log(`Gaps count: ${g2.gaps.length}`);

  await app.close();
}
test().catch(console.error);
