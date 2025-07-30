import { importSampleData } from '../server/import-data.js';

async function runImport() {
  console.log('Starting data import...');
  try {
    const result = await importSampleData();
    console.log('Import result:', result);
  } catch (error) {
    console.error('Import failed:', error);
  }
}

runImport();