import express from 'express';
import { createQuiz, getMyQuizzes, getQuizById, updateQuiz } from '../controllers/facultyController.js';
import { getAvailableQuizzes, getQuizInstructions, startQuiz, getAttemptById, updateAttemptAnswers, updateAttemptWarning, terminateAttempt, submitAttempt, getStudentResults } from '../controllers/studentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/quizzes', protect, authorizeRoles('faculty'), createQuiz);
router.get('/quizzes/my-quizzes', protect, authorizeRoles('faculty'), getMyQuizzes);
router.get('/quizzes/:id', protect, authorizeRoles('faculty'), getQuizById);
router.patch('/quizzes/:id', protect, authorizeRoles('faculty'), updateQuiz);
router.get('/student/quizzes/available', protect, authorizeRoles('student'), getAvailableQuizzes);
router.get('/student/quizzes/upcoming', protect, authorizeRoles('student'), getAvailableQuizzes);
router.get('/student/quizzes/:id/instructions', protect, authorizeRoles('student'), getQuizInstructions);
router.post('/student/quizzes/:id/start', protect, authorizeRoles('student'), startQuiz);
router.get('/student/attempts/:attemptId', protect, authorizeRoles('student'), getAttemptById);
router.patch('/student/attempts/:attemptId/answers', protect, authorizeRoles('student'), updateAttemptAnswers);
router.patch('/student/attempts/:attemptId/warning', protect, authorizeRoles('student'), updateAttemptWarning);
router.post('/student/attempts/:attemptId/terminate', protect, authorizeRoles('student'), terminateAttempt);
router.post('/student/attempts/:attemptId/submit', protect, authorizeRoles('student'), submitAttempt);
router.get('/student/results', protect, authorizeRoles('student'), getStudentResults);

export default router;
