import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import Modal from '../components/Modal.jsx';
import { AvatarStack } from '../components/Avatar.jsx';
import { fmtDate, isOverdue } from '../utils.js';

function NewProject({ onClose }) {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', description: '', dueDate: '', members: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      const memberEmails = f.members.split(/[,\s]+/).filter(Boolean);
      const { data } = await api.post('/projects', { name: f.name, description: f.description, dueDate: f.dueDate || null, memberEmails });
      nav(`/projects/${data._id}`);
    } catch (x) { setErr(x.response?.data?.message || 'Could not create project'); }
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold">New project</h2>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="label">Project name</label><input className="input" value={f.name} onChange={set('name')} required autoFocus /></div>
        <div><label className="label">Description</label><textarea className="input" rows={3} value={f.description} onChange={set('description')} /></div>
        <div><label className="label">Due date</label><input type="date" className="input" value={f.dueDate} onChange={set('dueDate')} /></div>
        <div><label className="label">Members (emails, comma separated)</label><input className="input" placeholder="sara@demo.com, omar@demo.com" value={f.members} onChange={set('members')} /></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Create project</button></div>
      </form>
    </Modal>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/projects').then((r) => setProjects(r.data)).finally(() => setLoading(false)); }, []);
  useEffect(() => { setQ(sp.get('q') || ''); if (sp.get('new')) setShow(true); }, [sp]);
  const list = projects.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">My Projects</h1>
        <input className="input max-w-xs" placeholder="🔍 Search projects…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => setShow(true)}>+ New Project</button>
      </div>
      {loading && <p className="text-gray-400">Loading…</p>}
      {!loading && list.length === 0 && <div className="card p-10 text-center text-gray-400">No projects found.</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <Link key={p._id} to={`/projects/${p._id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="font-semibold">{p.name}</h3>
            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500">{p.description || 'No description'}</p>
            <div className="mt-4 flex justify-between text-xs text-gray-500"><span>Progress</span><span>{p.done}/{p.total} tasks · {p.progress}%</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${p.progress}%` }} /></div>
            <div className="mt-4 flex items-center justify-between">
              <AvatarStack users={p.members} />
              {p.dueDate && <span className={`text-xs ${isOverdue(p.dueDate) ? 'text-red-600' : 'text-gray-500'}`}>📅 {fmtDate(p.dueDate)}</span>}
            </div>
          </Link>
        ))}
      </div>
      {show && <NewProject onClose={() => setShow(false)} />}
    </div>
  );
}
