import { verifyToken } from '../utils/token.js';
import { sendError } from '../utils/response.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return sendError(res, 'Authentication required.', 401);
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token.', 401);
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 'You are not authorized to access this resource.', 403);
    }

    next();
  };
};
