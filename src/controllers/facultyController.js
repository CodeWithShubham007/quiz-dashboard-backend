import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { facultyProfileUpdateSchema } from '../validators/auth.js';
import {
  getFacultyFromMemoryStore,
  updateFacultyProfileImageInMemoryStore,
} from './authController.js';

const sanitizeFacultyProfile = (faculty) => ({
  _id: faculty._id,
  name: faculty.name,
  employeeId: faculty.employeeId,
  courses: faculty.courses,
  semesters: faculty.semesters,
  profileImage: faculty.profileImage || null,
  role: faculty.role,
  isActive: faculty.isActive,
  createdAt: faculty.createdAt,
  updatedAt: faculty.updatedAt,
});

const memoryQuizzes = [];
const memoryAttempts = [];

const getFacultyQuizzes = async (facultyId) => {
  if (mongoose.connection.readyState === 1) {
    return Quiz.find({ facultyId }).lean();
  }
  return memoryQuizzes.filter((quiz) => quiz.facultyId === facultyId);
};

const getFacultyResults = async (facultyId) => {
  if (mongoose.connection.readyState === 1) {
    const quizzes = await Quiz.find({ facultyId }).select('_id').lean();
    const quizIds = quizzes.map((quiz) => quiz._id);
    if (quizIds.length === 0) return [];

    return QuizAttempt.find({ quizId: { $in: quizIds } })
      .select('quizId studentId startedAt submittedAt obtainedMarks totalMarks percentage status warningCount securityEvents tabSwitchCount fullScreenExitCount focusLossCount terminatedReason')
      .populate('studentId', 'name studentId email')
      .lean();
  }

  return memoryAttempts.filter((attempt) => {
    const quiz = memoryQuizzes.find((item) => item._id === attempt.quizId);
    return quiz && quiz.facultyId === facultyId;
  });
};

export const facultyDashboard = async (req, res) => {
  try {
    const quizzes = await getFacultyQuizzes(req.user.id);
    const attempts = await getFacultyResults(req.user.id);

    const dashboard = {
      totalQuizzes: quizzes.length,
      scheduledQuizzes: quizzes.filter((q) => q.status === 'scheduled').length,
      activeQuizzes: quizzes.filter((q) => q.status === 'active').length,
      completedQuizzes: quizzes.filter((q) => q.status === 'completed').length,
      totalAttempts: attempts.length,
      charts: {
        participation: quizzes.map((quiz) => ({ name: quiz.title, value: attempts.filter((a) => a.quizId === quiz._id).length })),
        averageMarks: quizzes.map((quiz) => ({ name: quiz.title, value: quiz.totalMarks ? Math.round((attempts.filter((a) => a.quizId === quiz._id).reduce((sum, item) => sum + (item.obtainedMarks || 0), 0) / Math.max(attempts.filter((a) => a.quizId === quiz._id).length, 1)) * 100) / 100 : 0 })),
      },
    };

    return sendSuccess(res, { dashboard });
  } catch (error) {
    return sendError(res, 'Unable to load faculty dashboard.', 500, error.message);
  }
};

export const getFacultyProfile = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const faculty = await Faculty.findById(req.user.id).lean();
      if (!faculty) return sendError(res, 'Faculty not found.', 404);
      return sendSuccess(res, { profile: sanitizeFacultyProfile(faculty) });
    }

    const faculty = getFacultyFromMemoryStore(req.user.id);
    if (!faculty) return sendError(res, 'Faculty not found.', 404);
    return sendSuccess(res, { profile: faculty });
  } catch (error) {
    return sendError(res, 'Unable to load faculty profile.', 500, error.message);
  }
};

export const updateFacultyProfile = async (req, res) => {
  try {
    const { profileImage } = facultyProfileUpdateSchema.parse(req.body);
    let faculty;

    if (mongoose.connection.readyState === 1) {
      faculty = await Faculty.findByIdAndUpdate(
        req.user.id,
        { $set: { profileImage } },
        { new: true, runValidators: true }
      ).lean();
      if (!faculty) return sendError(res, 'Faculty not found.', 404);
      faculty = sanitizeFacultyProfile(faculty);
    } else {
      faculty = updateFacultyProfileImageInMemoryStore(req.user.id, profileImage);
      if (!faculty) return sendError(res, 'Faculty not found.', 404);
    }

    return sendSuccess(res, { profile: faculty });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Invalid profile picture.', 400, error.errors);
    }
    return sendError(res, 'Unable to update faculty profile.', 500, error.message);
  }
};

export const createQuiz = async (req, res) => {
  try {
    const payload = { ...req.body, facultyId: req.user.id };

    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.create(payload);
      return sendSuccess(res, { quiz }, 201);
    }

    const quiz = {
      ...payload,
      _id: String(Date.now()),
      status: payload.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryQuizzes.push(quiz);
    return sendSuccess(res, { quiz }, 201);
  } catch (error) {
    return sendError(res, 'Unable to create quiz.', 500, error.message);
  }
};

export const getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await getFacultyQuizzes(req.user.id);
    return sendSuccess(res, { quizzes });
  } catch (error) {
    return sendError(res, 'Unable to load quizzes.', 500, error.message);
  }
};

export const getQuizById = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findOne({ _id: req.params.id, facultyId: req.user.id }).lean();
      if (!quiz) return sendError(res, 'Quiz not found.', 404);
      return sendSuccess(res, { quiz });
    }

    const quiz = memoryQuizzes.find((item) => item._id === req.params.id && item.facultyId === req.user.id);
    if (!quiz) return sendError(res, 'Quiz not found.', 404);
    return sendSuccess(res, { quiz });
  } catch (error) {
    return sendError(res, 'Unable to fetch quiz.', 500, error.message);
  }
};

export const updateQuiz = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const quiz = await Quiz.findOneAndUpdate({ _id: req.params.id, facultyId: req.user.id }, req.body, { new: true });
      if (!quiz) return sendError(res, 'Quiz not found.', 404);
      return sendSuccess(res, { quiz });
    }

    const index = memoryQuizzes.findIndex((item) => item._id === req.params.id && item.facultyId === req.user.id);
    if (index === -1) return sendError(res, 'Quiz not found.', 404);
    memoryQuizzes[index] = { ...memoryQuizzes[index], ...req.body, updatedAt: new Date().toISOString() };
    return sendSuccess(res, { quiz: memoryQuizzes[index] });
  } catch (error) {
    return sendError(res, 'Unable to update quiz.', 500, error.message);
  }
};

export const getQuizResults = async (req, res) => {
  try {
    const quizzes = await getFacultyQuizzes(req.user.id);
    const results = await getFacultyResults(req.user.id);
    return sendSuccess(res, { quizzes, results });
  } catch (error) {
    return sendError(res, 'Unable to load quiz results.', 500, error.message);
  }
};
