import mongoose from 'mongoose';
import { migrateHumanToOtherConnections } from '../migrations/humanToOtherConnections';
import { migrateOrganisationsToEnvironments } from '../migrations/organisationsToEnvironments';

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
    // After the connection migration, so the moved connections get an environment as well
    await migrateOrganisationsToEnvironments();
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // stop server if DB fails
  }
};

export default connectDB;