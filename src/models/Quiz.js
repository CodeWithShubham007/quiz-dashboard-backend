import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, default: '' },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    questionType: { type: String, enum: ['mcq', 'true_false', 'multiple_select'], required: true },
    options: [optionSchema],
    correctAnswer: { type: String, default: '' },
    marks: { type: Number, default: 1 },
    explanation: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    department: { type: String, enum: ['BCA', 'B.Tech'], required: true },
    semester: { type: Number, required: true },
    course: { type: String, required: true },
    questions: [questionSchema],
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    duration: { type: Number, required: true },
    showQuestionNumber: { type: Boolean, default: true },
    showMarksToStudents: { type: Boolean, default: false },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled', 'archived'],
      default: 'draft',
    },
    resultVisibility: {
      type: String,
      enum: ['immediate', 'after_end', 'hidden'],
      default: 'after_end',
    },
    instructions: { type: String, default: '' },
    securitySettings: {
      requireFullScreen: { type: Boolean, default: false },
      detectTabSwitch: { type: Boolean, default: false },
      detectCopyPaste: { type: Boolean, default: false },
      detectFocusLoss: { type: Boolean, default: false },
      maxViolations: { type: Number, default: 0 },
      autoSubmitOnViolation: { type: Boolean, default: false },
    },
    negativeMarking: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

quizSchema.index({ facultyId: 1, status: 1 });
quizSchema.index({ department: 1, semester: 1, course: 1, status: 1 });
quizSchema.index({ startTime: 1, endTime: 1 });

export default mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
