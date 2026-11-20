import { Router } from 'express';
import { Task, Project, User } from '../models.js';
import { auth, broadcast, notify, populateTask, isMember } from '../helpers.js';

const r = Router();
r.use(auth);

const load = async (req) => {
  const t = await Task.findById(req.params.id);
  if (!t) return null;
  const p = await Project.findById(t.project);
  if (!p || !isMember(p, req.user)) return null;
  req.project = p;
  return t;
};
const guard = (fn) => async (req, res) => {
  const t = await load(req);
  if (!t) return res.status(404).json({ message: 'Task not found' });
  return fn(req, res, t);
};
const finish = async (req, res, event, t) => {
  const tasks = await broadcast(req, event, t.project);
  res.json({ tasks, task: tasks.find((x) => String(x._id) === String(t._id)) || null });
};
const log = (t, user, text) => t.activity.push({ user: user._id, text });
const link = (t) => `/projects/${t.project}`;

r.get('/mine', async (req, res) => {
  res.json(await populateTask(Task.find({ assignee: req.user._id }).populate('project', 'name').sort('dueDate')));
});
r.post('/', async (req, res) => {
  const { project, list, title } = req.body;
  const p = await Project.findById(project);
  if (!p || !isMember(p, req.user) || !p.lists.id(list) || !title?.trim()) return res.status(400).json({ message: 'Invalid task' });
  const order = await Task.countDocuments({ project, list });
  const t = new Task({ project, list, title: title.trim(), order, createdBy: req.user._id });
  log(t, req.user, 'created this task');
  await t.save();
  await finish(req, res, 'taskCreated', t);
});
r.get('/:id', guard(async (req, res, t) => res.json(await populateTask(Task.findById(t._id)))));
r.put('/:id', guard(async (req, res, t) => {
  for (const k of ['title', 'description', 'priority', 'dueDate', 'labels', 'attachments']) {
    if (k in req.body && JSON.stringify(req.body[k]) !== JSON.stringify(t[k])) {
      t[k] = k === 'dueDate' ? (req.body[k] || null) : req.body[k];
      log(t, req.user, k === 'priority' ? `set priority to ${req.body[k]}` : `updated the ${k}`);
    }
  }
  await t.save();
  await finish(req, res, 'taskUpdated', t);
}));
r.put('/:id/assign', guard(async (req, res, t) => {
  const a = req.body.assignee || null;
  if (a && !isMember(req.project, { _id: a })) return res.status(400).json({ message: 'Not a project member' });
  const u = a && (await User.findById(a).select('name'));
  t.assignee = a;
  log(t, req.user, a ? `assigned this task to ${u.name}` : 'unassigned this task');
  await t.save();
  if (a) await notify(req, a, `${req.user.name} assigned you a task: ${t.title}`, link(t));
  await finish(req, res, 'taskUpdated', t);
}));
r.put('/:id/move', guard(async (req, res, t) => {
  const { list, position = 0 } = req.body;
  const target = req.project.lists.id(list);
  if (!target) return res.status(400).json({ message: 'Invalid list' });
  const siblings = await Task.find({ project: t.project, list, _id: { $ne: t._id } }).sort('order');
  if (String(t.list) !== String(list)) {
    log(t, req.user, `moved this to ${target.name}`);
    t.list = list;
    await t.save();
    if (t.assignee) await notify(req, t.assignee, `${req.user.name} moved "${t.title}" to ${target.name}`, link(t));
  }
  siblings.splice(Math.min(position, siblings.length), 0, t);
  await Task.bulkWrite(siblings.map((s, i) => ({ updateOne: { filter: { _id: s._id }, update: { $set: { order: i } } } })));
  await finish(req, res, 'taskMoved', t);
}));
r.delete('/:id', guard(async (req, res, t) => { await t.deleteOne(); await finish(req, res, 'taskDeleted', t); }));

r.post('/:id/comments', guard(async (req, res, t) => {
  const text = req.body.text?.trim();
  if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
  t.comments.push({ user: req.user._id, text, parent: req.body.parent || null });
  log(t, req.user, 'commented');
  await t.save();
  const targets = new Set([t.assignee, t.createdBy].filter(Boolean).map(String));
  for (const id of targets) await notify(req, id, `${req.user.name} commented on your task: ${t.title}`, link(t));
  await finish(req, res, 'newComment', t);
}));
r.delete('/:id/comments/:cid', guard(async (req, res, t) => {
  const c = t.comments.id(req.params.cid);
  if (!c || String(c.user) !== String(req.user._id)) return res.status(403).json({ message: 'You can only delete your own comments' });
  t.comments.pull({ _id: c._id });
  t.comments.pull({ parent: c._id });
  await t.save();
  await finish(req, res, 'taskUpdated', t);
}));

r.post('/:id/checklist', guard(async (req, res, t) => {
  if (!req.body.text?.trim()) return res.status(400).json({ message: 'Text is required' });
  t.checklist.push({ text: req.body.text.trim() });
  await t.save();
  await finish(req, res, 'taskUpdated', t);
}));
r.put('/:id/checklist/:itemId', guard(async (req, res, t) => {
  const i = t.checklist.id(req.params.itemId);
  if (!i) return res.status(404).json({ message: 'Item not found' });
  if ('done' in req.body) i.done = !!req.body.done;
  if (req.body.text) i.text = req.body.text;
  await t.save();
  await finish(req, res, 'taskUpdated', t);
}));
r.delete('/:id/checklist/:itemId', guard(async (req, res, t) => {
  t.checklist.pull(req.params.itemId);
  await t.save();
  await finish(req, res, 'taskUpdated', t);
}));
export default r;
