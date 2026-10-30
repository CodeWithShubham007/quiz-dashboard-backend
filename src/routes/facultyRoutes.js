import express from 'express';
import { facultyDashboard, getFacultyProfile, updateFacultyProfile, createQuiz, getMyQuizzes, getQuizById, updateQuiz, getQuizResults } from '../controllers/facultyController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('faculty'));

router.get('/dashboard', facultyDashboard);
router.get('/profile', getFacultyProfile);
router.patch('/profile', updateFacultyProfile);
router.post('/quizzes', createQuiz);
router.get('/quizzes', getMyQuizzes);
router.get('/quizzes/:id', getQuizById);
router.patch('/quizzes/:id', updateQuiz);
router.get('/results', getQuizResults);

export default router;
