import { Router } from 'express';
import { Project, Task, User } from '../models.js';
import { auth, userFields, isMember, projectTasks, notify } from '../helpers.js';

const r = Router();
r.use(auth);
const DEFAULT_LISTS = ['To Do', 'In Progress', 'In Review', 'Done'].map((name) => ({ name }));

const withProgress = async (projects) => {
  const tasks = await Task.find({ project: { $in: projects.map((p) => p._id) } }).select('project list');
  return projects.map((p) => {
    const o = p.toObject();
    const mine = tasks.filter((t) => String(t.project) === String(p._id));
    const doneIds = o.lists.filter((l) => /done/i.test(l.name)).map((l) => String(l._id));
    const done = mine.filter((t) => doneIds.includes(String(t.list))).length;
    return { ...o, total: mine.length, done, progress: mine.length ? Math.round((done / mine.length) * 100) : 0 };
  });
};
const find = async (req, res) => {
  const p = await Project.findById(req.params.id).populate('members', userFields);
  if (!p || !isMember(p, req.user)) { res.status(404).json({ message: 'Project not found' }); return null; }
  return p;
};
const push = async (req, id) => {
  const project = await Project.findById(id).populate('members', userFields);
  const tasks = await projectTasks(id);
  req.app.get('io').to('project:' + id).emit('projectUpdated', { project, tasks });
  return { project, tasks };
};

r.get('/', async (req, res) => {
  const ps = await Project.find({ members: req.user._id }).populate('members', userFields).sort('-createdAt');
  res.json(await withProgress(ps));
});
r.post('/', async (req, res) => {
  const { name, description, dueDate, memberEmails = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Project name is required' });
  const found = await User.find({ email: { $in: memberEmails.map((e) => e.trim().toLowerCase()) } });
  const members = [...new Set([String(req.user._id), ...found.map((u) => String(u._id))])];
  const p = await Project.create({ name, description, dueDate: dueDate || null, owner: req.user._id, members, lists: DEFAULT_LISTS });
  req.project = p;
  for (const id of members) await notify(req, id, `${req.user.name} added you to the project "${p.name}"`, `/projects/${p._id}`);
  const full = await Project.findById(p._id).populate('members', userFields);
  res.json((await withProgress([full]))[0]);
});
r.get('/:id', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  res.json({ project: (await withProgress([p]))[0], tasks: await projectTasks(p._id) });
});
r.put('/:id', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  for (const k of ['name', 'description', 'dueDate']) if (k in req.body) p[k] = req.body[k] || (k === 'dueDate' ? null : p[k]);
  await p.save();
  res.json((await withProgress([p]))[0]);
});
r.delete('/:id', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  if (String(p.owner) !== String(req.user._id)) return res.status(403).json({ message: 'Only the owner can delete a project' });
  await Task.deleteMany({ project: p._id });
  await p.deleteOne();
  res.json({ ok: true });
});
r.post('/:id/members', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  const u = await User.findOne({ email: (req.body.email || '').trim().toLowerCase() });
  if (!u) return res.status(404).json({ message: 'No user with that email' });
  if (!isMember(p, u)) {
    p.members.push(u._id); await p.save();
    await notify(req, u._id, `${req.user.name} added you to the project "${p.name}"`, `/projects/${p._id}`);
  }
  res.json(await push(req, p._id));
});
r.delete('/:id/members/:userId', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  const self = req.params.userId === String(req.user._id);
  if (!self && String(p.owner) !== String(req.user._id)) return res.status(403).json({ message: 'Only the owner can remove members' });
  if (String(p.owner) === req.params.userId) return res.status(400).json({ message: 'The owner cannot be removed' });
  p.members.pull(req.params.userId); await p.save();
  await Task.updateMany({ project: p._id, assignee: req.params.userId }, { assignee: null });
  res.json(await push(req, p._id));
});
r.post('/:id/lists', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  if (!req.body.name?.trim()) return res.status(400).json({ message: 'List name is required' });
  p.lists.push({ name: req.body.name.trim() }); await p.save();
  res.json(await push(req, p._id));
});
r.put('/:id/lists/:listId', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  const l = p.lists.id(req.params.listId);
  if (!l || !req.body.name?.trim()) return res.status(400).json({ message: 'Invalid list' });
  l.name = req.body.name.trim(); await p.save();
  res.json(await push(req, p._id));
});
r.delete('/:id/lists/:listId', async (req, res) => {
  const p = await find(req, res); if (!p) return;
  p.lists.pull(req.params.listId); await p.save();
  await Task.deleteMany({ project: p._id, list: req.params.listId });
  res.json(await push(req, p._id));
});
export default r;
