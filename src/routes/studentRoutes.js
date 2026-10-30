import express from 'express';
import {
  studentDashboard,
  getAvailableQuizzes,
  getStudentProfile,
  getQuizInstructions,
  startQuiz,
  getAttemptById,
  updateAttemptAnswers,
  updateAttemptWarning,
  terminateAttempt,
  submitAttempt,
  getStudentResults,
} from '../controllers/studentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('student'));

router.get('/dashboard', studentDashboard);
router.get('/profile', getStudentProfile);
router.get('/quizzes/available', getAvailableQuizzes);
router.get('/quizzes/upcoming', getAvailableQuizzes);
router.get('/quizzes/:id/instructions', getQuizInstructions);
router.post('/quizzes/:id/start', startQuiz);
router.get('/attempts/:attemptId', getAttemptById);
router.patch('/attempts/:attemptId/answers', updateAttemptAnswers);
router.patch('/attempts/:attemptId/warning', updateAttemptWarning);
router.post('/attempts/:attemptId/terminate', terminateAttempt);
router.post('/attempts/:attemptId/submit', submitAttempt);
router.get('/attempts', getStudentResults);
router.get('/results', getStudentResults);
router.get('/results/:attemptId', getAttemptById);

export default router;
