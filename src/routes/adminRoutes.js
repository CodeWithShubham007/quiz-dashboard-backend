import express from 'express';
import { listUsers, updateFaculty, updateStudent, listPasswordHelpRequests, resolvePasswordHelpRequest } from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, authorizeRoles('admin'));
router.get('/password-help-requests', listPasswordHelpRequests);
router.patch('/password-help-requests/:id/resolve', resolvePasswordHelpRequest);
router.get('/users', listUsers);
router.patch('/users/students/:id', updateStudent);
router.patch('/users/faculty/:id', updateFaculty);

export default router;
