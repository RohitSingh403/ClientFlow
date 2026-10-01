import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

if (!process.env.MONGODB_URI) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const memoryServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = memoryServer.getUri();
  process.env.SEED_ON_BOOT = process.env.SEED_ON_BOOT || 'true';
  console.log('No MONGODB_URI set. Using an in-memory database and loading the Northline demo.');
  console.log('Data resets when the API stops. Copy backend/.env.example to backend/.env for a persistent database.');
}

await import('../src/index.js');
