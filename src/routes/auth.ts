import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { config } from '../config';
import { AppError } from '../errors';
import { registerSchema, loginSchema } from '../validation/schemas';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, password } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash },
  });

  res.status(201).json({ message: 'User registered successfully' });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const matches = user && (await bcrypt.compare(password, user.passwordHash));

  if (!user || !matches) {
    throw new AppError(401, 'Invalid email or password');
  }

  const access_token = jwt.sign(
    { sub: user.id, email: user.email },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(200).json({ access_token });
});
