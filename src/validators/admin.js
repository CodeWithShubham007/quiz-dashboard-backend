import { z } from 'zod';

const optionalPassword = z.string()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include an uppercase letter, a lowercase letter, and a number.')
  .optional();

export const adminStudentUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  studentId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()).optional(),
  phoneNumber: z.string().trim().min(10).max(15).optional(),
  department: z.enum(['BCA', 'B.Tech']).optional(),
  semester: z.number().int().min(1).max(8).optional(),
  course: z.string().trim().min(2).optional(),
  parentContactNumber: z.string().trim().min(10).max(15).optional(),
  isActive: z.boolean().optional(),
  password: optionalPassword,
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const adminFacultyUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  employeeId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()).optional(),
  phoneNumber: z.string().trim().max(15).refine((value) => value.length === 0 || value.length >= 10, 'Phone number must be at least 10 digits.').optional(),
  courses: z.array(z.enum(['BCA', 'B.Tech'])).min(1).optional(),
  semesters: z.array(z.number().int().min(1).max(8)).min(1).optional(),
  isActive: z.boolean().optional(),
  password: optionalPassword,
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
