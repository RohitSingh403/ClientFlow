import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }
  process.env.JWT_SECRET = 'dev-only-change-me';
}

const { connectDb } = await import('./config/db.js');
const { app } = await import('./app.js');
const { startJobs } = await import('./jobs/overdue.js');
const { seed } = await import('./seed/seed.js');

try {
  await connectDb(process.env.MONGODB_URI);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (process.env.SEED_ON_BOOT === 'true') {
  await seed();
}

startJobs();

const port = Number(process.env.PORT) || 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`ClientFlow API listening on http://localhost:${port}`);
});
