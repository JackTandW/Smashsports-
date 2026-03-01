// Must load env vars BEFORE any module imports that use them
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  // Dynamic import after env vars are loaded
  const { POST } = await import('../app/api/refresh/route');

  const request = new Request('http://localhost/api/refresh', { method: 'POST' });
  console.log('Starting Sprout Social data refresh...');
  const start = Date.now();
  const response = await POST(request);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const result = await response.json();
  console.log(`Refresh completed in ${elapsed}s`);
  console.log('Status:', result.status);
  console.log('Message:', result.message);
  if (result.dailyMetrics) console.log('Daily metrics:', result.dailyMetrics);
  if (result.posts) console.log('Posts:', result.posts);
  if (result.recordsUpdated) console.log('Records updated:', result.recordsUpdated);
  if (result.error) {
    console.error('Error:', result.error);
    console.error('Details:', result.message);
  }
}

main().catch((e) => {
  console.error('Refresh failed:', e.message);
  process.exit(1);
});
