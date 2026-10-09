import mongoose from 'mongoose';
import { migrateHumanToOtherConnections } from '../migrations/humanToOtherConnections';

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('❌ MongoDB connection string is missing in .env');
  process.exit(1);
}

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
    await migrateHumanToOtherConnections();
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // stop server if DB fails
  }
};

export default connectDB;