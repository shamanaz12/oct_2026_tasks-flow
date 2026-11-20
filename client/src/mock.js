// In-browser fake backend used when the real API is unreachable (demo mode).
const KEY = 'taskflow_demo_db';
const id = () => Math.random().toString(36).slice(2, 10);
const day = (n) => new Date(Date.now() + n * 864e5).toISOString();

function seed() {
  const users = ['Ali Khan', 'Sara Ahmed', 'Omar Farooq', 'Ayesha Noor'].map((name, i) => ({ _id: 'u' + (i + 1), name, email: name.split(' ')[0].toLowerCase() + '@demo.com', avatar: '' }));
  const L = (p) => ['To Do', 'In Progress', 'In Review', 'Done'].map((name, i) => ({ _id: `${p}l${i + 1}`, name }));
  const T = (p, li, order, title, assignee, priority, due, x = {}) => ({
    _id: id(), project: p, list: `${p}l${li}`, order, title, description: x.d || '', assignee, createdBy: 'u1', priority, dueDate: day(due),
    labels: x.labels || [], checklist: (x.check || []).map(([text, done]) => ({ _id: id(), text, done })), attachments: [],
    comments: x.comments || [], activity: [{ _id: id(), user: 'u1', text: 'created this task', createdAt: day(-3) }],
  });
  return {
    users,
    projects: [
      { _id: 'p1', name: 'Website Redesign', description: 'Refresh the marketing site.', dueDate: day(14), owner: 'u1', members: ['u1', 'u2', 'u3', 'u4'], lists: L('p1') },
      { _id: 'p2', name: 'Mobile App Launch', description: 'Ship v1 of the mobile app.', dueDate: day(30), owner: 'u1', members: ['u1', 'u3', 'u4'], lists: L('p2') },
    ],
    tasks: [
      T('p1', 1, 0, 'Design new homepage', 'u2', 'High', 5, { labels: ['Design'], check: [['Wireframes', true], ['Hi-fi mockups', false]], d: '<p>Create a <b>bold</b> new homepage.</p>' }),
      T('p1', 1, 1, 'Write copy for About page', 'u3', 'Low', 9),
      T('p1', 2, 0, 'Build responsive navbar', 'u1', 'Medium', 3, { labels: ['Frontend'], check: [['Desktop layout', true], ['Mobile drawer', false]] }),
      T('p1', 2, 1, 'Set up CI pipeline', 'u4', 'Medium', 6),
      T('p1', 3, 0, 'Review landing page mockups', 'u1', 'High', 1, { comments: [{ _id: id(), user: 'u2', text: 'Ready for your review!', parent: null, createdAt: day(-1) }] }),
      T('p1', 4, 0, 'Launch announcement', 'u2', 'Low', -2),
      T('p2', 1, 0, 'Define app onboarding flow', 'u4', 'High', 7),
      T('p2', 2, 0, 'Integrate push notifications', 'u3', 'Medium', 10),
    ],
    notifs: [
      { _id: id(), text: 'Sara Ahmed assigned you a task: Review landing page mockups', link: '/projects/p1', read: false, createdAt: day(-0.1) },
      { _id: id(), text: 'Omar Farooq commented on your task: Build responsive navbar', link: '/projects/p1', read: false, createdAt: day(-0.5) },
      { _id: id(), text: 'Ayesha Noor added you to the project "Mobile App Launch"', link: '/projects/p2', read: true, createdAt: day(-2) },
    ],
  };
}
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));

export default async function mock(config) {
  const db = load();
  const me = db.users[0];
  const method = config.method.toLowerCase();
  const url = config.url.replace(/^\/api/, '').split('?')[0];
  const b = config.data ? JSON.parse(config.data) : {};
  const now = () => new Date().toISOString();
  const done = (data) => ({ data: JSON.parse(JSON.stringify(data ?? {})), status: 200, statusText: 'OK', headers: {}, config, request: {} });
  const fail = (s, m) => { const e = new Error(m); e.response = { status: s, data: { message: m } }; throw e; };
  const m = (meth, pat) => {
    if (meth !== method) return null;
    const x = url.match(new RegExp('^' + pat.replace(/:\w+/g, '([^/]+)') + '$'));
    return x && x.slice(1);
  };
  const U = (uid) => db.users.find((u) => u._id === uid) || null;
  const uByEmail = (e) => {
    e = (e || '').trim().toLowerCase();
    let u = db.users.find((x) => x.email === e);
    if (!u) { u = { _id: id(), name: e.split('@')[0], email: e, avatar: '' }; db.users.push(u); }
    return u;
  };
  const popT = (t) => ({ ...t, assignee: U(t.assignee), comments: t.comments.map((c) => ({ ...c, user: U(c.user) })), activity: t.activity.map((a) => ({ ...a, user: U(a.user) })) });
  const prog = (p) => {
    const ts = db.tasks.filter((t) => t.project === p._id);
    const dl = p.lists.filter((l) => /done/i.test(l.name)).map((l) => l._id);
    const d = ts.filter((t) => dl.includes(t.list)).length;
    return { ...p, members: p.members.map(U), total: ts.length, done: d, progress: ts.length ? Math.round((d / ts.length) * 100) : 0 };
  };
  const proj = (pid) => db.projects.find((p) => p._id === pid) || fail(404, 'Project not found');
  const tasksOf = (pid) => db.tasks.filter((t) => t.project === pid).sort((a, c) => a.order - c.order).map(popT);
  const pr = (p) => { save(db); return done({ project: prog(p), tasks: tasksOf(p._id) }); };
  const out = (t) => { save(db); return done({ tasks: tasksOf(t.project), task: db.tasks.includes(t) ? popT(t) : null }); };
  const log = (t, text) => t.activity.push({ _id: id(), user: me._id, text, createdAt: now() });
  let a;

  // auth
  if (m('post', '/auth/login') || m('post', '/auth/register')) return done({ token: 'demo', user: me });
  if (m('get', '/auth/me')) return done(me);
  if (m('put', '/auth/me')) { Object.assign(me, { name: b.name || me.name, avatar: b.avatar ?? me.avatar }); save(db); return done(me); }

  // projects
  if (m('get', '/projects')) return done(db.projects.map(prog));
  if (m('post', '/projects')) {
    const p = { _id: id(), name: b.name, description: b.description || '', dueDate: b.dueDate || null, owner: me._id, members: [me._id, ...(b.memberEmails || []).map((e) => uByEmail(e)._id)], lists: ['To Do', 'In Progress', 'In Review', 'Done'].map((name) => ({ _id: id(), name })) };
    p.members = [...new Set(p.members)];
    db.projects.unshift(p); save(db);
    return done(prog(p));
  }
  if ((a = m('get', '/projects/:id'))) return pr(proj(a[0]));
  if ((a = m('put', '/projects/:id'))) { const p = proj(a[0]); Object.assign(p, { name: b.name ?? p.name, description: b.description ?? p.description, dueDate: b.dueDate ?? p.dueDate }); save(db); return done(prog(p)); }
  if ((a = m('delete', '/projects/:id'))) { db.projects = db.projects.filter((p) => p._id !== a[0]); db.tasks = db.tasks.filter((t) => t.project !== a[0]); save(db); return done({}); }
  if ((a = m('post', '/projects/:id/members'))) { const p = proj(a[0]); p.members = [...new Set([...p.members, uByEmail(b.email)._id])]; return pr(p); }
  if ((a = m('delete', '/projects/:id/members/:uid'))) { const p = proj(a[0]); p.members = p.members.filter((x) => x !== a[1]); db.tasks.forEach((t) => { if (t.project === p._id && t.assignee === a[1]) t.assignee = null; }); return pr(p); }
  if ((a = m('post', '/projects/:id/lists'))) { const p = proj(a[0]); p.lists.push({ _id: id(), name: b.name }); return pr(p); }
  if ((a = m('put', '/projects/:id/lists/:lid'))) { const p = proj(a[0]); p.lists.find((l) => l._id === a[1]).name = b.name; return pr(p); }
  if ((a = m('delete', '/projects/:id/lists/:lid'))) { const p = proj(a[0]); p.lists = p.lists.filter((l) => l._id !== a[1]); db.tasks = db.tasks.filter((t) => t.list !== a[1]); return pr(p); }

  // tasks
  if (m('get', '/tasks/mine')) return done(db.tasks.filter((t) => t.assignee === me._id).map((t) => ({ ...popT(t), project: { _id: t.project, name: proj(t.project).name } })));
  if (m('post', '/tasks')) {
    const t = { _id: id(), project: b.project, list: b.list, order: db.tasks.filter((x) => x.list === b.list).length, title: b.title, description: '', assignee: null, createdBy: me._id, priority: 'Medium', dueDate: null, labels: [], checklist: [], attachments: [], comments: [], activity: [] };
    log(t, 'created this task'); db.tasks.push(t);
    return out(t);
  }
  const tm = url.match(/^\/tasks\/([^/]+)/);
  const t = tm && db.tasks.find((x) => x._id === tm[1]);
  if (t) {
    if (m('put', '/tasks/:id')) {
      ['title', 'description', 'priority', 'dueDate', 'labels', 'attachments'].forEach((k) => {
        if (k in b) { t[k] = k === 'dueDate' ? b[k] || null : b[k]; log(t, k === 'priority' ? `set priority to ${b[k]}` : `updated the ${k}`); }
      });
      return out(t);
    }
    if (m('put', '/tasks/:id/assign')) { t.assignee = b.assignee || null; log(t, b.assignee ? `assigned this task to ${U(b.assignee).name}` : 'unassigned this task'); return out(t); }
    if (m('put', '/tasks/:id/move')) {
      const sib = db.tasks.filter((x) => x.list === b.list && x !== t).sort((x, y) => x.order - y.order);
      if (t.list !== b.list) { log(t, `moved this to ${proj(t.project).lists.find((l) => l._id === b.list).name}`); t.list = b.list; }
      sib.splice(b.position, 0, t); sib.forEach((x, i) => (x.order = i));
      return out(t);
    }
    if (m('delete', '/tasks/:id')) { db.tasks = db.tasks.filter((x) => x !== t); return out(t); }
    if (m('post', '/tasks/:id/comments')) { t.comments.push({ _id: id(), user: me._id, text: b.text, parent: b.parent || null, createdAt: now() }); log(t, 'commented'); return out(t); }
    if ((a = m('delete', '/tasks/:id/comments/:cid'))) { t.comments = t.comments.filter((c) => c._id !== a[1] && c.parent !== a[1]); return out(t); }
    if (m('post', '/tasks/:id/checklist')) { t.checklist.push({ _id: id(), text: b.text, done: false }); return out(t); }
    if ((a = m('put', '/tasks/:id/checklist/:iid'))) { const i = t.checklist.find((x) => x._id === a[1]); if ('done' in b) i.done = b.done; return out(t); }
    if ((a = m('delete', '/tasks/:id/checklist/:iid'))) { t.checklist = t.checklist.filter((x) => x._id !== a[1]); return out(t); }
  }

  // notifications
  if (m('get', '/notifications')) return done(db.notifs);
  if (m('put', '/notifications/read-all')) { db.notifs.forEach((n) => (n.read = true)); save(db); return done({}); }
  if ((a = m('put', '/notifications/:id/read'))) { const n = db.notifs.find((x) => x._id === a[0]); if (n) n.read = true; save(db); return done({}); }
  return fail(404, `Demo route not found: ${method} ${url}`);
}
