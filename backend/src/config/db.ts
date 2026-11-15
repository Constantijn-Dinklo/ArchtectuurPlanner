import mongoose from 'mongoose';
import { migrateOrganisationRoles } from '../migrations/organisationRoles';

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('❌ MongoDB connection string is missing in .env');
  process.exit(1);
}

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
    await migrateOrganisationRoles();
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // stop server if DB fails
  }
};

export default connectDB;
