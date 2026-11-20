import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
}, { timestamps: true }));

export const Project = model('Project', new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  dueDate: Date,
  owner: ref('User'),
  members: [ref('User')],
  lists: [{ name: String }],
}, { timestamps: true }));

export const Task = model('Task', new Schema({
  project: ref('Project'),
  list: Schema.Types.ObjectId,
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignee: { ...ref('User'), default: null },
  createdBy: ref('User'),
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  dueDate: { type: Date, default: null },
  labels: [String],
  order: { type: Number, default: 0 },
  checklist: [{ text: String, done: { type: Boolean, default: false } }],
  attachments: [{ name: String, url: String }],
  comments: [{ user: ref('User'), text: String, parent: { type: Schema.Types.ObjectId, default: null }, createdAt: { type: Date, default: Date.now } }],
  activity: [{ user: ref('User'), text: String, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true }));

export const Notification = model('Notification', new Schema({
  user: ref('User'), text: String, link: String, read: { type: Boolean, default: false },
}, { timestamps: true }));
