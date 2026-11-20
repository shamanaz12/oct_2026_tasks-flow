import { Router } from 'express';
import { Notification } from '../models.js';
import { auth } from '../helpers.js';

const r = Router();
r.use(auth);
r.get('/', async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort('-createdAt').limit(50)));
r.put('/read-all', async (req, res) => { await Notification.updateMany({ user: req.user._id }, { read: true }); res.json({ ok: true }); });
r.put('/:id/read', async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
});
export default r;
