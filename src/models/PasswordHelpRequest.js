import mongoose from 'mongoose';

const passwordHelpRequestSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['student', 'faculty'], required: true },
    accountId: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.PasswordHelpRequest
  || mongoose.model('PasswordHelpRequest', passwordHelpRequestSchema);
