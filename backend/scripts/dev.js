import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

if (!process.env.MONGODB_URI) {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = path.join(root, 'data');
  fs.mkdirSync(dbPath, { recursive: true });
  const database = await MongoMemoryServer.create({
    instance: {
      dbPath,
      dbName: 'clientflow',
      storageEngine: 'wiredTiger',
      launchTimeout: 60000,
    },
  });
  process.env.MONGODB_URI = database.getUri('clientflow');
  process.env.SEED_ON_BOOT = process.env.SEED_ON_BOOT || 'true';
  console.log('No MONGODB_URI set. Using the local database in backend/data.');
  console.log('That data stays on disk when the API stops. Set MONGODB_URI in backend/.env to use another MongoDB.');
}

await import('../src/index.js');
