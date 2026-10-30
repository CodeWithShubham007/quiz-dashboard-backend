import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });

const removeLegacyFacultyPhoneIndex = async () => {
  const collection = mongoose.connection.db.collection('faculties');
  const indexes = await collection.indexes();
  const legacyIndexes = indexes.filter(
    (index) => index.unique && index.key.phoneNumber && Object.keys(index.key).length === 1
  );

  for (const index of legacyIndexes) {
    await collection.dropIndex(index.name);
  }

  console.log(`faculties: removed ${legacyIndexes.length} legacy phone-number index(es).`);
};

try {
  await mongoose.connect(process.env.MONGODB_URI);
  await removeLegacyFacultyPhoneIndex();
} catch (error) {
  console.error('Auth migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
