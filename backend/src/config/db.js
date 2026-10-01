import mongoose from 'mongoose';

export async function connectDb(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Add it to backend/.env, or run npm run dev to use the in-memory database.',
    );
  }
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch {
    throw new Error(
      'Could not connect to MongoDB. Check MONGODB_URI, or unset it and run npm run dev for the in-memory database.',
    );
  }
}
