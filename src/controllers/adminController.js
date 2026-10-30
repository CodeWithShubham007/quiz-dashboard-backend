import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import PasswordHelpRequest from '../models/PasswordHelpRequest.js';
import { adminFacultyUpdateSchema, adminStudentUpdateSchema } from '../validators/admin.js';
import { sendError, sendSuccess } from '../utils/response.js';

const studentProjection = '-password';
const facultyProjection = '-password';

export const listPasswordHelpRequests = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return sendError(res, 'Password help requests require an active database connection.', 503);
    }

    const requests = await PasswordHelpRequest.find()
      .sort({ status: 1, createdAt: -1 })
      .limit(100)
      .lean();
    return sendSuccess(res, { requests });
  } catch (error) {
    return sendError(res, 'Unable to load password help requests.', 500, error.message);
  }
};

export const resolvePasswordHelpRequest = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return sendError(res, 'Password help requests require an active database connection.', 503);
    }

    const request = await PasswordHelpRequest.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'resolved', resolvedAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    if (!request) return sendError(res, 'Pending password help request not found.', 404);
    return sendSuccess(res, { request });
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 'Password help request not found.', 404);
    return sendError(res, 'Unable to resolve the password help request.', 500, error.message);
  }
};

export const listUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return sendError(res, 'User management requires an active database connection.', 503);
    }

    const [students, faculties] = await Promise.all([
      Student.find({}, studentProjection).sort({ name: 1 }).lean(),
      Faculty.find({}, facultyProjection).sort({ name: 1 }).lean(),
    ]);
    return sendSuccess(res, { students, faculties });
  } catch (error) {
    return sendError(res, 'Unable to load users.', 500, error.message);
  }
};

const updateUser = async (req, res, Model, schema, entityName, uniqueFields) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return sendError(res, 'User management requires an active database connection.', 503);
    }

    const updates = schema.parse(req.body);
    const { password, ...profileUpdates } = updates;
    if (password) profileUpdates.password = await bcrypt.hash(password, 10);

    for (const field of uniqueFields) {
      if (profileUpdates[field] === undefined) continue;
      const conflict = await Model.findOne({
        [field]: profileUpdates[field],
        _id: { $ne: req.params.id },
      }).select('_id').lean();
      if (conflict) return sendError(res, `${entityName} ${field} is already in use.`, 409);
    }

    const user = await Model.findByIdAndUpdate(
      req.params.id,
      { $set: profileUpdates },
      { new: true, runValidators: true, select: '-password' }
    ).lean();
    if (!user) return sendError(res, `${entityName} not found.`, 404);
    return sendSuccess(res, { user });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Invalid user details.', 400, error.errors);
    }
    if (error.name === 'CastError') return sendError(res, `${entityName} not found.`, 404);
    if (error.code === 11000) return sendError(res, 'A unique user field is already in use.', 409);
    return sendError(res, `Unable to update ${entityName.toLowerCase()}.`, 500, error.message);
  }
};

export const updateStudent = (req, res) => updateUser(
  req, res, Student, adminStudentUpdateSchema, 'Student', ['email', 'studentId', 'phoneNumber']
);

export const updateFaculty = (req, res) => updateUser(
  req, res, Faculty, adminFacultyUpdateSchema, 'Faculty', ['employeeId']
);
