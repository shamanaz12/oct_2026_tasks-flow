import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { PRIORITY, fmtDate, isOverdue } from '../utils.js';

export default function MyTasks() {
  const [tasks, setTasks] = useState(null);
  const nav = useNavigate();
  useEffect(() => { api.get('/tasks/mine').then((r) => setTasks(r.data)); }, []);
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">My Tasks</h1>
      {!tasks && <p className="text-gray-400">Loading…</p>}
      {tasks?.length === 0 && <div className="card p-10 text-center text-gray-400">Nothing assigned to you.</div>}
      <div className="space-y-2">
        {tasks?.map((t) => {
          const done = t.checklist.filter((c) => c.done).length;
          return (
            <button key={t._id} onClick={() => nav(`/projects/${t.project._id}`)} className="card flex w-full flex-wrap items-center gap-3 p-4 text-left hover:shadow-md">
              <div className="min-w-0 flex-1"><div className="font-medium">{t.title}</div><div className="text-xs text-gray-500">{t.project.name}{t.checklist.length > 0 && ` · ☑ ${done}/${t.checklist.length}`}</div></div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY[t.priority]}`}>{t.priority}</span>
              {t.dueDate && <span className={`text-xs ${isOverdue(t.dueDate) ? 'font-medium text-red-600' : 'text-gray-500'}`}>📅 {fmtDate(t.dueDate)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
