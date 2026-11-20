import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext.jsx';
import Modal from './Modal.jsx';
import { Avatar } from './Avatar.jsx';
import { PRIORITY, ago, isOverdue, safeUrl, sanitize } from '../utils.js';

function RichEditor({ value, onSave }) {
  const ref = useRef();
  const [dirty, setDirty] = useState(false);
  useEffect(() => { ref.current.innerHTML = sanitize(value); setDirty(false); }, [value]);
  const cmd = (c, v) => { document.execCommand(c, false, v); ref.current.focus(); setDirty(true); };
  const btns = [['bold', 'B', 'font-bold'], ['italic', 'I', 'italic'], ['underline', 'U', 'underline'], ['insertUnorderedList', '• List'], ['insertOrderedList', '1. List']];
  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-gray-200 bg-gray-50 p-1">
        {btns.map(([c, l, cls]) => <button type="button" key={c} onMouseDown={(e) => { e.preventDefault(); cmd(c); }} className={`rounded px-2 py-1 text-sm hover:bg-gray-200 ${cls || ''}`}>{l}</button>)}
        <button type="button" className="rounded px-2 py-1 text-sm hover:bg-gray-200" onMouseDown={(e) => { e.preventDefault(); const u = prompt('Link URL (https://…)'); if (u && /^https?:\/\//i.test(u)) cmd('createLink', u); }}>🔗 Link</button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={() => setDirty(true)} className="rich min-h-[100px] rounded-b-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" />
      {dirty && <button className="btn-primary mt-2" onClick={() => onSave(sanitize(ref.current.innerHTML))}>Save description</button>}
    </div>
  );
}

function Comment({ c, replies, me, onDelete, onReply }) {
  const [reply, setReply] = useState(false);
  const [text, setText] = useState('');
  return (
    <div className="flex gap-2">
      <Avatar user={c.user} size={28} />
      <div className="min-w-0 flex-1">
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm"><b>{c.user?.name}</b> <span className="text-xs text-gray-400">{ago(c.createdAt)}</span><p className="whitespace-pre-wrap break-words">{c.text}</p></div>
        <div className="mt-1 flex gap-3 text-xs text-gray-500">
          {onReply && <button className="hover:text-violet-600" onClick={() => setReply(!reply)}>Reply</button>}
          {c.user?._id === me && <button className="hover:text-red-600" onClick={onDelete}>Delete</button>}
        </div>
        {reply && <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onReply(text, c._id); setText(''); setReply(false); } }}><input autoFocus className="input" placeholder="Write a reply…" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn-primary">Reply</button></form>}
        {replies?.length > 0 && <div className="mt-2 space-y-2 border-l-2 border-gray-100 pl-3">{replies}</div>}
      </div>
    </div>
  );
}

export default function TaskModal({ taskId, tasks, project, onApply, onClose }) {
  const { user } = useAuth();
  const task = tasks.find((t) => t._id === taskId);
  const [title, setTitle] = useState(task?.title || '');
  const [item, setItem] = useState('');
  const [label, setLabel] = useState('');
  const [att, setAtt] = useState({ name: '', url: '' });
  const [comment, setComment] = useState('');
  useEffect(() => { if (!task) onClose(); else setTitle(task.title); }, [task?.title, !!task]);
  if (!task) return null;

  const call = async (fn) => { try { onApply((await fn()).data); } catch (e) { alert(e.response?.data?.message || 'Something went wrong'); } };
  const put = (body) => call(() => api.put(`/tasks/${taskId}`, body));
  const base = `/tasks/${taskId}`;
  const done = task.checklist.filter((c) => c.done).length;
  const pct = task.checklist.length ? Math.round((done / task.checklist.length) * 100) : 0;
  const top = task.comments.filter((c) => !c.parent);
  const del = (c) => call(() => api.delete(`${base}/comments/${c._id}`));
  const addComment = (text, parent) => call(() => api.post(`${base}/comments`, { text, parent }));

  return (
    <Modal onClose={onClose} wide>
      <div className="mb-4 flex items-start gap-3">
        <input className="w-full rounded-lg border border-transparent px-2 py-1 text-xl font-bold hover:border-gray-200 focus:border-violet-400 focus:outline-none" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== task.title && put({ title: title.trim() })} />
        <button className="btn-ghost" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_16rem]">
        <div className="min-w-0 space-y-6">
          <section><label className="label">Description</label><RichEditor value={task.description} onSave={(description) => put({ description })} /></section>

          <section>
            <label className="label">Checklist {task.checklist.length > 0 && `· ${pct}%`}</label>
            {task.checklist.length > 0 && <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-violet-600" style={{ width: `${pct}%` }} /></div>}
            {task.checklist.map((c) => (
              <div key={c._id} className="group flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={c.done} onChange={(e) => call(() => api.put(`${base}/checklist/${c._id}`, { done: e.target.checked }))} />
                <span className={`flex-1 ${c.done ? 'text-gray-400 line-through' : ''}`}>{c.text}</span>
                <button className="text-gray-300 hover:text-red-500" onClick={() => call(() => api.delete(`${base}/checklist/${c._id}`))}>✕</button>
              </div>
            ))}
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (item.trim()) call(() => api.post(`${base}/checklist`, { text: item })).then(() => setItem('')); }}>
              <input className="input" placeholder="Add checklist item…" value={item} onChange={(e) => setItem(e.target.value)} /><button className="btn-outline">Add</button>
            </form>
          </section>

          <section>
            <label className="label">Attachments (links)</label>
            {task.attachments.map((a) => (
              <div key={a._id || a.url} className="flex items-center gap-2 py-1 text-sm">
                <a className="flex-1 truncate text-violet-600 hover:underline" href={safeUrl(a.url)} target="_blank" rel="noopener noreferrer">🔗 {a.name || a.url}</a>
                <button className="text-gray-300 hover:text-red-500" onClick={() => put({ attachments: task.attachments.filter((x) => x !== a).map(({ name, url }) => ({ name, url })) })}>✕</button>
              </div>
            ))}
            <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (/^https?:\/\//i.test(att.url)) { put({ attachments: [...task.attachments.map(({ name, url }) => ({ name, url })), { name: att.name || att.url, url: att.url }] }); setAtt({ name: '', url: '' }); } else alert('Enter a valid http(s) link'); }}>
              <input className="input flex-1" placeholder="Name (optional)" value={att.name} onChange={(e) => setAtt({ ...att, name: e.target.value })} />
              <input className="input flex-[2]" placeholder="https://…" value={att.url} onChange={(e) => setAtt({ ...att, url: e.target.value })} /><button className="btn-outline">Attach</button>
            </form>
          </section>

          <section>
            <label className="label">Comments</label>
            <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) { addComment(comment); setComment(''); } }}>
              <Avatar user={user} size={28} /><input className="input" placeholder="Write a comment…" value={comment} onChange={(e) => setComment(e.target.value)} /><button className="btn-primary">Send</button>
            </form>
            <div className="space-y-3">
              {top.map((c) => (
                <Comment key={c._id} c={c} me={user._id} onDelete={() => del(c)} onReply={addComment}
                  replies={task.comments.filter((r) => r.parent === c._id).map((r) => <Comment key={r._id} c={r} me={user._id} onDelete={() => del(r)} />)} />
              ))}
              {top.length === 0 && <p className="text-sm text-gray-400">No comments yet.</p>}
            </div>
          </section>

          <section>
            <label className="label">Activity</label>
            <ul className="space-y-1 text-sm text-gray-600">
              {[...task.activity].reverse().map((a) => <li key={a._id}><b>{a.user?.name || 'Someone'}</b> {a.text} <span className="text-xs text-gray-400">· {ago(a.createdAt)}</span></li>)}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <div><label className="label">Assignee</label>
            <select className="input" value={task.assignee?._id || ''} onChange={(e) => call(() => api.put(`${base}/assign`, { assignee: e.target.value || null }))}>
              <option value="">Unassigned</option>{project.members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className="label">Priority</label>
            <select className="input" value={task.priority} onChange={(e) => put({ priority: e.target.value })}>{['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}</select>
            <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY[task.priority]}`}>{task.priority} priority</span>
          </div>
          <div><label className="label">Due date</label>
            <input type="date" className={`input ${isOverdue(task.dueDate) ? 'border-red-300 text-red-600' : ''}`} value={task.dueDate ? task.dueDate.slice(0, 10) : ''} onChange={(e) => put({ dueDate: e.target.value || null })} />
          </div>
          <div><label className="label">Labels</label>
            <div className="mb-2 flex flex-wrap gap-1">{task.labels.map((l) => <span key={l} className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">{l}<button onClick={() => put({ labels: task.labels.filter((x) => x !== l) })}>×</button></span>)}</div>
            <form onSubmit={(e) => { e.preventDefault(); const l = label.trim(); if (l && !task.labels.includes(l)) put({ labels: [...task.labels, l] }); setLabel(''); }}><input className="input" placeholder="Add label + Enter" value={label} onChange={(e) => setLabel(e.target.value)} /></form>
          </div>
          <button className="btn-outline w-full text-red-600" onClick={() => confirm('Delete this task?') && call(() => api.delete(base)).then(onClose)}>🗑 Delete task</button>
        </aside>
      </div>
    </Modal>
  );
}
