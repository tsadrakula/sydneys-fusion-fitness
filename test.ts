// Local test script - run with: bun test.ts

import { GET } from './api/book';

async function main() {
  console.log('Testing booking function...\n');

  const response = await GET();
  const data = await response.json();

  console.log('Response status:', response.status);
  console.log('\nResult:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
