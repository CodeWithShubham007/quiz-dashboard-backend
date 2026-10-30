import { z } from 'zod';

export const studentRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  studentId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  phoneNumber: z.string().min(10).max(15),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include an uppercase letter, a lowercase letter, and a number.'),
  department: z.enum(['BCA', 'B.Tech']),
  semester: z.number().min(1).max(8),
  course: z.string().min(2),
  parentContactNumber: z.string().min(10).max(15),
});

export const studentLoginSchema = z.object({
  studentId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

export const facultyRegisterSchema = z.object({
  name: z.string().min(2),
  employeeId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include an uppercase letter, a lowercase letter, and a number.'),
  courses: z.array(z.enum(['BCA', 'B.Tech'])).min(1, 'Select at least one course.').refine(
    (courses) => new Set(courses).size === courses.length,
    'Courses must not contain duplicates.'
  ),
  semesters: z.array(z.number().int().min(1).max(8)).min(1, 'Select at least one semester.').refine(
    (semesters) => new Set(semesters).size === semesters.length,
    'Semesters must not contain duplicates.'
  ),
});

export const facultyLoginSchema = z.object({
  employeeId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().email(),
  password: z.string().min(1),
});

export const facultyProfileUpdateSchema = z.object({
  profileImage: z.string()
    .max(1_400_000)
    .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
    .nullable(),
}).refine(
  ({ profileImage }) => profileImage === null
    || Buffer.from(profileImage.split(',')[1], 'base64').byteLength <= 1024 * 1024,
  'Profile picture must be 1 MB or smaller.'
);
