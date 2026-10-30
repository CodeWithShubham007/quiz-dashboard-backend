import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Faculty from './models/Faculty.js';
import Student from './models/Student.js';

dotenv.config();

const runSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quiz-dashboard');

    const existingFaculty = await Faculty.findOne({ employeeId: 'FAC001' });
    const existingStudent = await Student.findOne({ phoneNumber: '+919900000002' });

    if (!existingFaculty) {
      const hashedFacultyPassword = await bcrypt.hash('Faculty@123', 10);
      await Faculty.create({
        name: 'Dr. Aisha Sharma',
        employeeId: 'FAC001',
        password: hashedFacultyPassword,
        courses: ['BCA'],
        semesters: [3],
        role: 'faculty',
        isActive: true,
      });
      console.log('Seeded faculty account: FAC001 / Faculty@123');
    }

    if (!existingStudent) {
      const hashedStudentPassword = await bcrypt.hash('Student@123', 10);
      await Student.create({
        name: 'Rohan Verma',
        email: 'student@college.edu',
        studentId: 'STU001',
        phoneNumber: '+919900000002',
        password: hashedStudentPassword,
        department: 'BCA',
        semester: 3,
        course: 'AIML',
        parentContactNumber: '+919800000002',
        role: 'student',
        isActive: true,
      });
      console.log('Seeded student account: STU001 / Student@123');
    } else if (!existingStudent.studentId) {
      existingStudent.studentId = 'STU001';
      await existingStudent.save();
      console.log('Added Student ID STU001 to the existing seeded student account.');
    }

    console.log('Seed complete.');
  } catch (error) {
    console.error('Seed failed:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runSeed();
