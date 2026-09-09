import fs from 'fs';

const lines = fs.readFileSync('src/reports/generators/pdf-report.generator.ts', 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.y +') || line.includes('.y =') || line.includes('spacer(')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
