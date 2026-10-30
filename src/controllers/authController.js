import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import { adminLoginSchema, studentRegisterSchema, studentLoginSchema, facultyRegisterSchema, facultyLoginSchema } from '../validators/auth.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { signToken } from '../utils/token.js';
import PasswordHelpRequest from '../models/PasswordHelpRequest.js';
import { passwordHelpRequestSchema } from '../validators/passwordHelp.js';

const memoryStore = {
  students: [],
  faculties: [],
};

const validationErrorMessage = (error) => {
  const passwordIssue = error.errors?.find((issue) => issue.path.includes('password'));
  return passwordIssue?.message || 'Validation failed.';
};

export const requestPasswordHelp = async (req, res) => {
  try {
    const payload = passwordHelpRequestSchema.parse(req.body);
    if (mongoose.connection.readyState !== 1) {
      return sendError(res, 'Password help requests are temporarily unavailable.', 503);
    }

    await PasswordHelpRequest.findOneAndUpdate(
      { ...payload, status: 'pending' },
      { $setOnInsert: payload },
      { upsert: true, new: true, runValidators: true }
    );

    return sendSuccess(res, {
      message: 'If the account exists, an administrator will review the password help request.',
    }, 202);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, error.errors[0]?.message || 'Invalid password help request.', 400, error.errors);
    }
    return sendError(res, 'Unable to submit the password help request.', 500, error.message);
  }
};

const sanitizeStudent = (student) => ({
  _id: student._id,
  name: student.name,
  email: student.email,
  studentId: student.studentId,
  phoneNumber: student.phoneNumber,
  department: student.department,
  semester: student.semester,
  course: student.course,
  parentContactNumber: student.parentContactNumber,
  role: student.role,
  isActive: student.isActive,
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
});

const sanitizeFaculty = (faculty) => ({
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

export const getFacultyFromMemoryStore = (id) => {
  const faculty = memoryStore.faculties.find((item) => item._id === id);
  return faculty ? sanitizeFaculty(faculty) : null;
};

export const getStudentFromMemoryStore = (id) => {
  const student = memoryStore.students.find((item) => item._id === id);
  return student ? sanitizeStudent(student) : null;
};

export const updateFacultyProfileImageInMemoryStore = (id, profileImage) => {
  const faculty = memoryStore.faculties.find((item) => item._id === id);
  if (!faculty) return null;
  faculty.profileImage = profileImage;
  faculty.updatedAt = new Date().toISOString();
  return sanitizeFaculty(faculty);
};

const issueAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const registerStudent = async (req, res) => {
  try {
    const payload = studentRegisterSchema.parse(req.body);

    if (mongoose.connection.readyState === 1) {
      const exists = await Student.findOne({
        $or: [
          { studentId: payload.studentId },
          { phoneNumber: payload.phoneNumber },
          { email: payload.email },
        ],
      });
      if (exists) {
        return sendError(res, 'A student with that Student ID, phone number, or email already exists.', 409);
      }

      const hashed = await bcrypt.hash(payload.password, 10);
      const student = await Student.create({ ...payload, password: hashed });
      const token = signToken({ id: student._id, role: student.role });
      issueAuthCookie(res, token);
      return sendSuccess(res, { user: sanitizeStudent(student), token }, 201);
    }

    const existing = memoryStore.students.find((student) => (
      student.studentId === payload.studentId
      || student.phoneNumber === payload.phoneNumber
      || student.email === payload.email
    ));
    if (existing) {
      return sendError(res, 'A student with that Student ID, phone number, or email already exists.', 409);
    }

    const student = {
      ...payload,
      _id: String(Date.now()),
      role: 'student',
      isActive: true,
      password: await bcrypt.hash(payload.password, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.students.push(student);
    const token = signToken({ id: student._id, role: student.role });
    issueAuthCookie(res, token);
    return sendSuccess(res, { user: sanitizeStudent(student), token }, 201);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, validationErrorMessage(error), 400, error.errors);
    }
    return sendError(res, 'Unable to register student.', 500, error.message);
  }
};

export const loginStudent = async (req, res) => {
  try {
    const payload = studentLoginSchema.parse(req.body);

    if (mongoose.connection.readyState === 1) {
      const student = await Student.findOne({ studentId: payload.studentId });

      if (!student) return sendError(res, 'Invalid student credentials.', 401);
      const valid = await bcrypt.compare(payload.password, student.password);
      if (!valid) return sendError(res, 'Invalid student credentials.', 401);

      const token = signToken({ id: student._id, role: student.role });
      issueAuthCookie(res, token);
      return sendSuccess(res, { user: sanitizeStudent(student), token });
    }

    const student = memoryStore.students.find((item) => item.studentId === payload.studentId);
    if (!student) return sendError(res, 'Invalid student credentials.', 401);
    const valid = await bcrypt.compare(payload.password, student.password);
    if (!valid) return sendError(res, 'Invalid student credentials.', 401);

    const token = signToken({ id: student._id, role: student.role });
    issueAuthCookie(res, token);
    return sendSuccess(res, { user: sanitizeStudent(student), token });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, validationErrorMessage(error), 400, error.errors);
    }
    return sendError(res, 'Unable to log in.', 500, error.message);
  }
};

export const registerFaculty = async (req, res) => {
  try {
    const payload = facultyRegisterSchema.parse(req.body);

    if (mongoose.connection.readyState === 1) {
      const exists = await Faculty.findOne({ employeeId: payload.employeeId });
      if (exists) {
        return sendError(res, 'A faculty member with that Emp_ID already exists.', 409);
      }

      const hashed = await bcrypt.hash(payload.password, 10);
      const faculty = await Faculty.create({ ...payload, password: hashed });
      const token = signToken({ id: faculty._id, role: faculty.role });
      issueAuthCookie(res, token);
      return sendSuccess(res, { user: sanitizeFaculty(faculty), token }, 201);
    }

    const existing = memoryStore.faculties.find((faculty) => faculty.employeeId === payload.employeeId);
    if (existing) {
      return sendError(res, 'A faculty member with that Emp_ID already exists.', 409);
    }

    const faculty = {
      ...payload,
      _id: String(Date.now()),
      role: 'faculty',
      isActive: true,
      password: await bcrypt.hash(payload.password, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.faculties.push(faculty);
    const token = signToken({ id: faculty._id, role: faculty.role });
    issueAuthCookie(res, token);
    return sendSuccess(res, { user: sanitizeFaculty(faculty), token }, 201);
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, validationErrorMessage(error), 400, error.errors);
    }
    return sendError(res, 'Unable to register faculty.', 500, error.message);
  }
};

export const loginFaculty = async (req, res) => {
  try {
    const payload = facultyLoginSchema.parse(req.body);

    if (mongoose.connection.readyState === 1) {
      const faculty = await Faculty.findOne({ employeeId: payload.employeeId });

      if (!faculty) return sendError(res, 'Invalid faculty credentials.', 401);
      const valid = await bcrypt.compare(payload.password, faculty.password);
      if (!valid) return sendError(res, 'Invalid faculty credentials.', 401);

      const token = signToken({ id: faculty._id, role: faculty.role });
      issueAuthCookie(res, token);
      return sendSuccess(res, { user: sanitizeFaculty(faculty), token });
    }

    const faculty = memoryStore.faculties.find((item) => item.employeeId === payload.employeeId);
    if (!faculty) return sendError(res, 'Invalid faculty credentials.', 401);
    const valid = await bcrypt.compare(payload.password, faculty.password);
    if (!valid) return sendError(res, 'Invalid faculty credentials.', 401);

    const token = signToken({ id: faculty._id, role: faculty.role });
    issueAuthCookie(res, token);
    return sendSuccess(res, { user: sanitizeFaculty(faculty), token });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, validationErrorMessage(error), 400, error.errors);
    }
    return sendError(res, 'Unable to log in.', 500, error.message);
  }
};

export const loginAdmin = (req, res) => {
  try {
    const payload = adminLoginSchema.parse(req.body);
    const configuredUsername = process.env.ADMIN_USERNAME;
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (!configuredUsername || !configuredPassword) {
      console.error('Admin sign-in is unavailable because admin credentials are not configured.');
      return sendError(res, 'Admin sign-in is not configured.', 503);
    }

    const safeEqual = (provided, expected) => {
      const providedBuffer = Buffer.from(provided);
      const expectedBuffer = Buffer.from(expected);
      return providedBuffer.length === expectedBuffer.length
        && timingSafeEqual(providedBuffer, expectedBuffer);
    };

    if (!safeEqual(payload.username.toLowerCase(), configuredUsername.toLowerCase())
      || !safeEqual(payload.password, configuredPassword)) {
      return sendError(res, 'Invalid admin credentials.', 401);
    }

    const token = signToken({ id: 'admin', role: 'admin' });
    issueAuthCookie(res, token);
    return sendSuccess(res, {
      user: { _id: 'admin', name: 'Administrator', email: configuredUsername, role: 'admin' },
      token,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return sendError(res, validationErrorMessage(error), 400, error.errors);
    }
    return sendError(res, 'Unable to log in as admin.', 500, error.message);
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  return sendSuccess(res, { message: 'Logged out successfully.' });
};

export const getCurrentUser = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'admin' && id === 'admin') {
      return sendSuccess(res, {
        user: { _id: 'admin', name: 'Administrator', email: process.env.ADMIN_USERNAME, role: 'admin' },
      });
    }

    if (role === 'student') {
      if (mongoose.connection.readyState === 1) {
        const student = await Student.findById(id).lean();
        if (!student) return sendError(res, 'Student not found.', 404);
        return sendSuccess(res, { user: sanitizeStudent(student) });
      }

      const student = memoryStore.students.find((item) => item._id === id);
      if (!student) return sendError(res, 'Student not found.', 404);
      return sendSuccess(res, { user: sanitizeStudent(student) });
    }

    if (mongoose.connection.readyState === 1) {
      const faculty = await Faculty.findById(id).lean();
      if (!faculty) return sendError(res, 'Faculty not found.', 404);
      return sendSuccess(res, { user: sanitizeFaculty(faculty) });
    }

    const faculty = memoryStore.faculties.find((item) => item._id === id);
    if (!faculty) return sendError(res, 'Faculty not found.', 404);
    return sendSuccess(res, { user: sanitizeFaculty(faculty) });
  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 'Invalid or expired token.', 401);
    }
    return sendError(res, 'Unable to fetch current user.', 500, error.message);
  }
};
