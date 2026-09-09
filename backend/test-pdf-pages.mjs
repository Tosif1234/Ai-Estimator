// Generates a PDF report via the live API and counts pages using a simple /Page marker heuristic
import { writeFileSync } from 'fs';
import path from 'path';

// Login first to get token
const loginResp = await fetch('http://localhost:3001/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'tosif@gmail.com', password: 'test@123' })
});
const loginData = await loginResp.json();
const token = loginData?.data?.accessToken || loginData?.accessToken;
if (!token) {
  console.log('Login failed:', JSON.stringify(loginData));
  process.exit(1);
}
console.log('Logged in. Token:', token.substring(0, 30) + '...');

const projectId = 'cmtmh4tsq0004e4v3k2sflun1'; // Tour Travels Web Application

// Download PDF
const pdfResp = await fetch(`http://localhost:3001/projects/${projectId}/reports/pdf?version=4`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (!pdfResp.ok) {
  const text = await pdfResp.text();
  console.log('PDF error:', pdfResp.status, text.substring(0, 500));
  process.exit(1);
}

const buf = Buffer.from(await pdfResp.arrayBuffer());
const outPath = path.join(process.cwd(), 'test-output.pdf');
writeFileSync(outPath, buf);
console.log(`PDF saved to ${outPath} (${buf.length} bytes)`);

// Count pages: in PDF spec, each page is a /Type /Page dict
// Simple heuristic: count "/Type /Page" occurrences (won't count /Pages parent node)
const pdfText = buf.toString('latin1');
const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
const pageCount = pageMatches ? pageMatches.length : 0;
console.log(`Estimated page count: ${pageCount}`);

// Also check for any suspicious empty patterns
const contentStreams = pdfText.match(/stream\r?\n[\r\n\s]*endstream/g);
console.log(`Near-empty content streams (potential blank pages): ${contentStreams ? contentStreams.length : 0}`);
