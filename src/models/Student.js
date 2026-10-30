import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    studentId: { type: String, trim: true, uppercase: true },
    phoneNumber: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    department: { type: String, enum: ['BCA', 'B.Tech'], required: true },
    semester: { type: Number, required: true },
    course: { type: String, required: true },
    parentContactNumber: { type: String, required: true },
    role: { type: String, default: 'student' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index({ studentId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Student || mongoose.model('Student', studentSchema);
