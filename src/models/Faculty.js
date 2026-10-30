import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    phoneNumber: { type: String, trim: true },
    password: { type: String, required: true },
    courses: {
      type: [{ type: String, enum: ["BCA", "B.Tech"] }],
      required: true,
    },
    semesters: { type: [{ type: Number, min: 1, max: 8 }], required: true },
    profileImage: { type: String, maxlength: 1_400_000, default: null },
    role: { type: String, default: "faculty" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.models.Faculty ||
  mongoose.model("Faculty", facultySchema);
