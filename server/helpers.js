import jwt from 'jsonwebtoken';
import { User, Task, Notification } from './models.js';

export const userFields = 'name email avatar';
export const pub = (u) => ({ _id: u._id, name: u.name, email: u.email, avatar: u.avatar });
export const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id).select('-password');
    if (!req.user) throw new Error('no user');
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized' });
  }
};

export const populateTask = (q) =>
  q.populate('assignee', userFields).populate('comments.user', userFields).populate('activity.user', userFields);
export const projectTasks = (pid) => populateTask(Task.find({ project: pid }).sort('order'));
export const isMember = (project, user) => project.members.some((m) => String(m._id || m) === String(user._id));

export const notify = async (req, userId, text, link) => {
  if (String(userId) === String(req.user._id)) return;
  const n = await Notification.create({ user: userId, text, link });
  req.app.get('io').to('user:' + userId).emit('notification', n);
};

// Emits event to everyone viewing the project and returns the fresh task list.
export const broadcast = async (req, event, projectId) => {
  const tasks = await projectTasks(projectId);
  req.app.get('io').to('project:' + projectId).emit(event, { projectId: String(projectId), tasks });
  return tasks;
};
