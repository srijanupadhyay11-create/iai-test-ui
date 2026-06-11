import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import config from '../config.js';

const JWT_SECRET = config.server.jwtSecret;

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { first_name, last_name, email, phone, dob, organisation, password } = req.body;

  if (!first_name || !email || !phone || !dob || !password) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  db.prepare(`
    INSERT INTO users (first_name, last_name, email, phone, dob, organisation, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(first_name, last_name || '', email, phone, dob, organisation || '', password_hash);

  return res.status(201).json({ message: 'Registration successful' });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    token,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      organisation: user.organisation,
    }
  });
});

export default router;
