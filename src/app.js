import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import facultyRoutes from './routes/facultyRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import quizRoutes from './routes/quizRoutes.js';

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
});

const isLocalDevelopmentOrigin = (origin) => {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || url.port !== '5173') return false;
    if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) return true;

    const octets = url.hostname.split('.').map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      return false;
    }

    const [first, second] = octets;
    return first === 10
      || first === 127
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    const configuredOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
    const allowed = !origin
      || origin === configuredOrigin
      || (process.env.NODE_ENV !== 'production' && isLocalDevelopmentOrigin(origin));
    callback(null, allowed);
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(limiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Quiz dashboard API is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api', quizRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server.',
  });
});

export default app;
