import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Student from '../models/Student.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { getStudentFromMemoryStore } from './authController.js';

const memoryQuizzes = [];
const memoryAttempts = [];

const matchesStudentCourse = (quiz, student) => (
  String(quiz.course || '').trim().toLowerCase() === String(student.course || '').trim().toLowerCase()
);

const calculateAttemptScore = (quiz, attempt) => {
  const answersByQuestion = new Map(
    attempt.answers.map((answer) => [String(answer.questionId), answer.selectedAnswer])
  );
  let obtainedMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const question of quiz.questions) {
    const selectedAnswer = answersByQuestion.get(String(question._id));
    if (selectedAnswer === undefined || selectedAnswer === null || selectedAnswer === '') {
      unansweredCount += 1;
    } else if (String(selectedAnswer) === question.correctAnswer) {
      obtainedMarks += question.marks;
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }
  }

  attempt.obtainedMarks = obtainedMarks;
  attempt.totalMarks = quiz.totalMarks;
  attempt.percentage = quiz.totalMarks ? (obtainedMarks / quiz.totalMarks) * 100 : 0;
  attempt.correctCount = correctCount;
  attempt.incorrectCount = incorrectCount;
  attempt.unansweredCount = unansweredCount;
};

const normalizeQuizStatus = (quiz, now = new Date()) => {
  if (!quiz || !quiz.startTime || !quiz.endTime) return 'available';
  const startTime = new Date(quiz.startTime);
  const endTime = new Date(quiz.endTime);

  if (now < startTime) return 'upcoming';
  if (now >= endTime) return 'expired';
  return 'available';
};

const normalizeAttemptStatus = (attempt, quiz, now = new Date()) => {
  if (!attempt) return null;
  if (attempt.status === 'submitted') return 'completed';
  if (attempt.status === 'terminated') return 'expired';
  if (attempt.status === 'expired' || attempt.status === 'auto_submitted') return 'expired';
  if (attempt.status === 'in_progress' || attempt.status === 'ready') return 'in_progress';
  if (quiz && now > new Date(quiz.endTime)) return 'expired';
  return normalizeQuizStatus(quiz, now);
};

export const studentDashboard = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const student = await Student.findById(req.user.id).lean();
      if (!student) return sendError(res, 'Student not found.', 404);
      const quizzes = await Quiz.find({
        department: student.department,
        semester: student.semester,
        status: { $in: ['active', 'scheduled'] },
      }).lean();
      const matchingQuizzes = quizzes.filter((quiz) => matchesStudentCourse(quiz, student));
      const attempts = await QuizAttempt.find({ studentId: req.user.id }).lean();

      const quizList = matchingQuizzes.map((quiz) => {
        const quizAttempt = attempts.find((attempt) => String(attempt.quizId) === String(quiz._id));
        return {
          ...quiz,
          status: quizAttempt ? normalizeAttemptStatus(quizAttempt, quiz) : normalizeQuizStatus(quiz),
        };
      });

      return sendSuccess(res, {
        dashboard: {
          availableQuizzes: quizList.filter((q) => q.status === 'available' || q.status === 'in_progress').length,
          upcomingQuizzes: quizList.filter((q) => q.status === 'upcoming').length,
          completedQuizzes: attempts.filter((item) => item.status === 'submitted').length,
          averageMarks: attempts.length ? (attempts.reduce((sum, item) => sum + (item.obtainedMarks || 0), 0) / attempts.length).toFixed(2) : 0,
          recentAttempts: attempts.slice(0, 5),
        },
      });
    }

    return sendSuccess(res, {
      dashboard: {
        availableQuizzes: 0,
        upcomingQuizzes: 0,
        completedQuizzes: 0,
        averageMarks: 0,
        recentAttempts: [],
      },
    });
  } catch (error) {
    return sendError(res, 'Unable to load student dashboard.', 500, error.message);
  }
};

export const getAvailableQuizzes = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const student = await Student.findById(req.user.id).lean();
      if (!student) return sendError(res, 'Student not found.', 404);
      const quizzes = await Quiz.find({
        department: student.department,
        semester: student.semester,
        status: { $in: ['scheduled', 'active'] },
      }).select('-questions').populate('facultyId', 'name').lean();
      const matchingQuizzes = quizzes.filter((quiz) => matchesStudentCourse(quiz, student));

      const attempts = await QuizAttempt.find({ studentId: req.user.id }).lean();

      const mappedQuizzes = matchingQuizzes.map((quiz) => {
        const existingAttempt = attempts.find((attempt) => String(attempt.quizId) === String(quiz._id));
        const computedStatus = existingAttempt ? normalizeAttemptStatus(existingAttempt, quiz) : normalizeQuizStatus(quiz);
        return {
          ...quiz,
          status: computedStatus,
          studentAttemptId: existingAttempt?._id || null,
          isAttemptActive: existingAttempt && ['ready', 'in_progress'].includes(existingAttempt.status),
        };
      });

      return sendSuccess(res, { quizzes: mappedQuizzes });
    }

    return sendSuccess(res, { quizzes: [] });
  } catch (error) {
    return sendError(res, 'Unable to fetch available quizzes.', 500, error.message);
  }
};

export const getStudentProfile = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const student = await Student.findById(req.user.id).lean();
      if (!student) return sendError(res, 'Student not found.', 404);
      const { password, ...profile } = student;
      return sendSuccess(res, { profile });
    }

    const profile = getStudentFromMemoryStore(req.user.id);
    if (!profile) return sendError(res, 'Student not found.', 404);
    return sendSuccess(res, { profile });
  } catch (error) {
    return sendError(res, 'Unable to fetch profile.', 500, error.message);
  }
};

export const getQuizInstructions = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(req.params.id).lean();
      if (!quiz) return sendError(res, 'Quiz not found.', 404);
      const student = await Student.findById(req.user.id).lean();
      if (!student) return sendError(res, 'Student not found.', 404);
      if (
        !['scheduled', 'active'].includes(quiz.status)
        || quiz.department !== student.department
        || quiz.semester !== student.semester
        || !matchesStudentCourse(quiz, student)
      ) {
        return sendError(res, 'This quiz is not assigned to your class.', 403);
      }
      const questions = (quiz.questions || []).map(({ correctAnswer, ...question }) => question);
      return sendSuccess(res, { quiz: { title: quiz.title, description: quiz.description, subject: quiz.subject, totalMarks: quiz.totalMarks, totalQuestions: quiz.totalQuestions, duration: quiz.duration, startTime: quiz.startTime, endTime: quiz.endTime, instructions: quiz.instructions, questions } });
    }

    return sendError(res, 'Quiz not found.', 404);
  } catch (error) {
    return sendError(res, 'Unable to fetch quiz instructions.', 500, error.message);
  }
};

export const startQuiz = async (req, res) => {
  try {
    const quizId = req.params.id;

    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findById(quizId);
      if (!quiz) return sendError(res, 'Quiz not found.', 404);
      if (!['scheduled', 'active'].includes(quiz.status)) {
        return sendError(res, 'This quiz has not been published.', 403);
      }

      const student = await Student.findById(req.user.id).lean();
      if (!student) return sendError(res, 'Student not found.', 404);
      if (
        quiz.department !== student.department
        || quiz.semester !== student.semester
        || !matchesStudentCourse(quiz, student)
      ) {
        return sendError(res, 'This quiz is not assigned to your class.', 403);
      }

      const now = new Date();
      if (now < new Date(quiz.startTime)) {
        return sendError(res, 'This quiz has not started yet.', 403);
      }
      if (now >= new Date(quiz.endTime)) {
        return sendError(res, 'This quiz has ended.', 403);
      }

      const existing = await QuizAttempt.findOne({ quizId, studentId: req.user.id });
      if (existing) {
        if (['ready', 'in_progress'].includes(existing.status)) {
          if (now >= new Date(existing.deadline)) {
            existing.status = 'auto_submitted';
            existing.submittedAt = now;
            calculateAttemptScore(quiz, existing);
            await existing.save();
            return sendError(res, 'The time for this quiz has expired.', 403);
          }
          existing.lastActiveAt = new Date();
          await existing.save();
          return sendSuccess(res, { attempt: existing, resumed: true });
        }
        return sendError(res, 'You have already completed this quiz.', 409);
      }

      const attempt = await QuizAttempt.create({
        quizId,
        studentId: req.user.id,
        startedAt: now,
        deadline: new Date(Math.min(
          new Date(quiz.endTime).getTime(),
          now.getTime() + quiz.duration * 60 * 1000
        )),
        totalMarks: quiz.totalMarks,
        status: 'ready',
        warningCount: 0,
        lastActiveAt: now,
      });
      return sendSuccess(res, { attempt }, 201);
    }

    return sendError(res, 'Database is unavailable for quiz starts.', 503);
  } catch (error) {
    return sendError(res, 'Unable to start quiz.', 500, error.message);
  }
};

export const getAttemptById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const attempt = await QuizAttempt.findOne({ _id: req.params.attemptId, studentId: req.user.id }).lean();
      if (!attempt) return sendError(res, 'Attempt not found.', 404);
      return sendSuccess(res, { attempt });
    }

    return sendError(res, 'Attempt not found.', 404);
  } catch (error) {
    return sendError(res, 'Unable to fetch attempt.', 500, error.message);
  }
};

export const updateAttemptAnswers = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const attempt = await QuizAttempt.findOne({ _id: req.params.attemptId, studentId: req.user.id });
      if (!attempt) return sendError(res, 'Attempt not found.', 404);
      if (['submitted', 'expired', 'terminated', 'auto_submitted'].includes(attempt.status)) {
        return sendError(res, 'This attempt is no longer active.', 403);
      }
      if (Date.now() >= new Date(attempt.deadline).getTime()) {
        const quiz = await Quiz.findById(attempt.quizId).select('questions totalMarks');
        if (!quiz) return sendError(res, 'Quiz not found.', 404);
        attempt.status = 'auto_submitted';
        attempt.submittedAt = new Date();
        calculateAttemptScore(quiz, attempt);
        await attempt.save();
        return sendError(res, 'The time for this quiz has expired.', 403);
      }

      const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
      attempt.answers = answers;
      attempt.status = 'in_progress';
      attempt.lastActiveAt = new Date();
      await attempt.save();
      return sendSuccess(res, { attempt });
    }

    return sendError(res, 'Attempt not found.', 404);
  } catch (error) {
    return sendError(res, 'Unable to save answers.', 500, error.message);
  }
};

export const updateAttemptWarning = async (req, res) => {
  try {
    const eventType = req.body?.eventType;
    if (!['tab_switch', 'fullscreen_exit'].includes(eventType)) {
      return sendError(res, 'A valid security event type is required.', 400);
    }

    if (mongoose.connection.readyState === 1) {
      const attempt = await QuizAttempt.findOne({ _id: req.params.attemptId, studentId: req.user.id });
      if (!attempt) return sendError(res, 'Attempt not found.', 404);
      if (!['ready', 'in_progress'].includes(attempt.status)) {
        return sendError(res, 'This attempt is no longer active.', 403);
      }

      const nextCount = Math.min((attempt.warningCount || 0) + 1, 5);
      attempt.warningCount = nextCount;
      attempt.lastActiveAt = new Date();
      attempt.securityEvents.push({
        eventType,
        timestamp: new Date(),
        details: eventType === 'tab_switch'
          ? 'Quiz page lost visibility while the attempt was active.'
          : 'Quiz exited fullscreen while the attempt was active.',
      });
      if (eventType === 'tab_switch') attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
      if (eventType === 'fullscreen_exit') attempt.fullScreenExitCount = (attempt.fullScreenExitCount || 0) + 1;
      if (nextCount >= 5) {
        attempt.status = 'terminated';
        attempt.terminatedReason = 'maximum_warnings_reached';
      }
      await attempt.save();
      return sendSuccess(res, { attempt, warningCount: nextCount });
    }

    return sendError(res, 'Warning update unavailable.', 503);
  } catch (error) {
    return sendError(res, 'Unable to update warning count.', 500, error.message);
  }
};

export const terminateAttempt = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const attempt = await QuizAttempt.findOne({ _id: req.params.attemptId, studentId: req.user.id });
      if (!attempt) return sendError(res, 'Attempt not found.', 404);
      attempt.status = 'terminated';
      attempt.terminatedReason = req.body.reason || 'quiz_terminated';
      attempt.submittedAt = new Date();
      await attempt.save();
      return sendSuccess(res, { attempt });
    }

    return sendError(res, 'Termination unavailable.', 503);
  } catch (error) {
    return sendError(res, 'Unable to terminate attempt.', 500, error.message);
  }
};

export const submitAttempt = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const attempt = await QuizAttempt.findOne({ _id: req.params.attemptId, studentId: req.user.id });
      if (!attempt) return sendError(res, 'Attempt not found.', 404);
      if (['submitted', 'expired', 'terminated', 'auto_submitted'].includes(attempt.status)) {
        return sendSuccess(res, { attempt });
      }

      const quiz = await Quiz.findById(attempt.quizId).select('questions totalMarks');
      if (!quiz) return sendError(res, 'Quiz not found.', 404);
      const submittedAt = new Date();
      attempt.status = submittedAt >= new Date(attempt.deadline) ? 'auto_submitted' : 'submitted';
      attempt.submittedAt = submittedAt;
      calculateAttemptScore(quiz, attempt);
      await attempt.save();
      return sendSuccess(res, { attempt }, 200);
    }

    return sendError(res, 'Attempt not found.', 404);
  } catch (error) {
    return sendError(res, 'Unable to submit attempt.', 500, error.message);
  }
};

export const getStudentResults = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const attempts = await QuizAttempt.find({ studentId: req.user.id }).populate('quizId').lean();
      return sendSuccess(res, { results: attempts });
    }

    return sendSuccess(res, { results: [] });
  } catch (error) {
    return sendError(res, 'Unable to load results.', 500, error.message);
  }
};
