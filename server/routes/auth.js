import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models.js';
import { auth, sign, pub } from '../helpers.js';

const r = Router();
r.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(400).json({ message: 'Email already registered' });
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(u._id), user: pub(u) });
});
r.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email: (email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(password || '', u.password))) return res.status(400).json({ message: 'Invalid email or password' });
  res.json({ token: sign(u._id), user: pub(u) });
});
r.get('/me', auth, (req, res) => res.json(pub(req.user)));
r.put('/me', auth, async (req, res) => {
  if (req.body.name?.trim()) req.user.name = req.body.name.trim();
  if (typeof req.body.avatar === 'string') req.user.avatar = req.body.avatar.trim();
  await req.user.save();
  res.json(pub(req.user));
});
export default r;
