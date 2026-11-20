import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { Project } from './models.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import notificationRoutes from './routes/notifications.js';

const origin = process.env.CLIENT_URL || 'http://localhost:5173';
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin } });
app.set('io', io);
app.use(cors({ origin }));
app.use(express.json());
app.use((req, _res, next) => { req.body ??= {}; next(); });

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use((err, _req, res, _next) => {
  console.error(err.message);
  const notFound = err.name === 'CastError';
  res.status(notFound ? 404 : 500).json({ message: notFound ? 'Not found' : 'Server error' });
});

// ---- Socket.io: auth, rooms, presence ----
const online = new Map();
io.use((s, next) => {
  try { s.userId = jwt.verify(s.handshake.auth.token, process.env.JWT_SECRET).id; next(); }
  catch { next(new Error('unauthorized')); }
});
io.on('connection', (s) => {
  s.join('user:' + s.userId);
  online.set(s.userId, (online.get(s.userId) || 0) + 1);
  io.emit('presence', [...online.keys()]);
  s.on('joinProject', async (id) => {
    try {
      const p = await Project.findById(id).select('members');
      if (p?.members.some((m) => String(m) === s.userId)) s.join('project:' + id);
    } catch { /* ignore invalid ids */ }
  });
  s.on('leaveProject', (id) => s.leave('project:' + id));
  s.on('disconnect', () => {
    const c = (online.get(s.userId) || 1) - 1;
    c ? online.set(s.userId, c) : online.delete(s.userId);
    io.emit('presence', [...online.keys()]);
  });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow')
  .then(() => server.listen(PORT, () => console.log(`API + Socket.io on http://localhost:${PORT}`)))
  .catch((e) => console.error('MongoDB connection failed:', e.message, '\nThe client will fall back to demo mode.'));
