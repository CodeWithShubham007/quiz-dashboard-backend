import express from 'express';
import rateLimit from 'express-rate-limit';
import { registerStudent, loginStudent, registerFaculty, loginFaculty, loginAdmin, logout, getCurrentUser, requestPasswordHelp } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const passwordHelpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password help requests. Please try again later.' },
});

router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);
router.post('/faculty/register', registerFaculty);
router.post('/faculty/login', loginFaculty);
router.post('/password-help', passwordHelpLimiter, requestPasswordHelp);
router.post('/admin/login', loginAdmin);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

export default router;
