import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedAnswer: mongoose.Schema.Types.Mixed,
    isMarkedForReview: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const securityEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    questionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    details: { type: String, default: '' },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    startedAt: { type: Date, default: Date.now },
    deadline: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    answers: [answerSchema],
    obtainedMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['not_started', 'ready', 'in_progress', 'submitted', 'expired', 'auto_submitted', 'terminated'],
      default: 'ready',
    },
    warningCount: { type: Number, default: 0 },
    cameraPermission: { type: Boolean, default: false },
    microphonePermission: { type: Boolean, default: false },
    locationPermission: { type: Boolean, default: false },
    fullscreenEntered: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
    terminatedReason: { type: String, default: null },
    resultReleased: { type: Boolean, default: false },
    securityEvents: [securityEventSchema],
    tabSwitchCount: { type: Number, default: 0 },
    fullScreenExitCount: { type: Number, default: 0 },
    focusLossCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });
quizAttemptSchema.index({ studentId: 1, status: 1 });
quizAttemptSchema.index({ quizId: 1, status: 1 });

export default mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', quizAttemptSchema);
