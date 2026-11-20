import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Project, Task, Notification } from './models.js';

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow');
await Promise.all([User.deleteMany(), Project.deleteMany(), Task.deleteMany(), Notification.deleteMany()]);
const password = await bcrypt.hash('password123', 10);
const [ali, sara, omar, ayesha] = await User.insertMany(
  ['Ali Khan', 'Sara Ahmed', 'Omar Farooq', 'Ayesha Noor'].map((name) => ({ name, email: name.split(' ')[0].toLowerCase() + '@demo.com', password }))
);
const lists = ['To Do', 'In Progress', 'In Review', 'Done'].map((name) => ({ name }));
const p1 = await Project.create({ name: 'Website Redesign', description: 'Refresh the marketing site.', owner: ali._id, members: [ali, sara, omar, ayesha], lists, dueDate: new Date(Date.now() + 14 * 864e5) });
const p2 = await Project.create({ name: 'Mobile App Launch', description: 'Ship v1 of the mobile app.', owner: ali._id, members: [ali, omar, ayesha], lists: lists.map((l) => ({ ...l })), dueDate: new Date(Date.now() + 30 * 864e5) });
const day = (n) => new Date(Date.now() + n * 864e5);
const mk = (p, li, order, title, assignee, priority, due, extra = {}) => ({
  project: p._id, list: p.lists[li]._id, order, title, assignee: assignee._id, createdBy: ali._id, priority, dueDate: day(due),
  activity: [{ user: ali._id, text: 'created this task' }], ...extra,
});
await Task.insertMany([
  mk(p1, 0, 0, 'Design new homepage', sara, 'High', 5, { labels: ['Design'], checklist: [{ text: 'Wireframes', done: true }, { text: 'Hi-fi mockups' }] }),
  mk(p1, 0, 1, 'Write copy for About page', omar, 'Low', 9),
  mk(p1, 1, 0, 'Build responsive navbar', ali, 'Medium', 3, { labels: ['Frontend'] }),
  mk(p1, 1, 1, 'Set up CI pipeline', ayesha, 'Medium', 6),
  mk(p1, 2, 0, 'Review landing page mockups', ali, 'High', 1, { comments: [{ user: sara._id, text: 'Ready for your review!' }] }),
  mk(p1, 3, 0, 'Launch announcement', sara, 'Low', -2),
  mk(p2, 0, 0, 'Define app onboarding flow', ayesha, 'High', 7),
  mk(p2, 1, 0, 'Integrate push notifications', omar, 'Medium', 10),
]);
await Notification.create({ user: ali._id, text: 'Sara Ahmed assigned you a task: Review landing page mockups', link: `/projects/${p1._id}` });
console.log('Seeded. Log in with ali@demo.com / password123');
process.exit(0);
