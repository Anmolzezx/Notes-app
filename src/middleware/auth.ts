import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../errors';

interface TokenPayload {
  sub: string;
  email: string;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Unauthorized'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(new AppError(401, 'Unauthorized'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    if (!decoded.sub || !decoded.email) {
      return next(new AppError(401, 'Unauthorized'));
    }
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch {
    next(new AppError(401, 'Unauthorized'));
  }
};
