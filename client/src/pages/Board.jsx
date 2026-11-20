import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import api from '../api';
import { useAuth } from '../AuthContext.jsx';
import { useSocket } from '../SocketContext.jsx';
import { Avatar, AvatarStack } from '../components/Avatar.jsx';
import TaskModal from '../components/TaskModal.jsx';
import { PRIORITY, fmtDate, isOverdue } from '../utils.js';

function AddInline({ placeholder, button, onAdd, className = '' }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState('');
  const submit = (e) => { e.preventDefault(); if (v.trim()) onAdd(v.trim()); setV(''); setOpen(false); };
  if (!open) return <button className={`btn-ghost w-full justify-start ${className}`} onClick={() => setOpen(true)}>+ {button}</button>;
  return (
    <form onSubmit={submit} className="space-y-2">
      <input autoFocus className="input" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} />
      <div className="flex gap-2"><button className="btn-primary">Add</button><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}

function ListHeader({ list, count, onRename, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(list.name);
  const save = () => { setEdit(false); if (name.trim() && name !== list.name) onRename(name.trim()); else setName(list.name); };
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      {edit
        ? <input autoFocus className="input py-1" value={name} onChange={(e) => setName(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && save()} />
        : <h3 className="flex-1 cursor-text truncate text-sm font-semibold" onClick={() => setEdit(true)} title="Click to rename">{list.name} <span className="ml-1 rounded-full bg-gray-200 px-2 text-xs font-medium text-gray-600">{count}</span></h3>}
      <button className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600" title="Delete list" onClick={() => confirm(`Delete "${list.name}" and all its tasks?`) && onDelete()}>🗑</button>
    </div>
  );
}

function Card({ t, onOpen }) {
  const done = t.checklist.filter((c) => c.done).length;
  return (
    <div onClick={onOpen} className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-violet-300">
      {t.labels.length > 0 && <div className="mb-2 flex flex-wrap gap-1">{t.labels.map((l) => <span key={l} className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">{l}</span>)}</div>}
      <div className="text-sm font-medium">{t.title}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY[t.priority]}`}>{t.priority}</span>
        {t.dueDate && <span className={isOverdue(t.dueDate) ? 'text-red-600' : ''}>📅 {fmtDate(t.dueDate)}</span>}
        {t.checklist.length > 0 && <span>☑ {done}/{t.checklist.length}</span>}
        {t.comments.length > 0 && <span>💬 {t.comments.length}</span>}
        <span className="ml-auto">{t.assignee && <Avatar user={t.assignee} size={24} />}</span>
      </div>
    </div>
  );
}

export default function Board() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, online } = useSocket();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [panel, setPanel] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const apply = useCallback((d) => { if (d.project) setProject(d.project); if (d.tasks) setTasks(d.tasks); }, []);
  const load = useCallback(() => api.get(`/projects/${id}`).then((r) => apply(r.data)).catch(() => setError('Project not found')), [id, apply]);
  useEffect(() => { setProject(null); setError(''); load(); }, [load]);

  // real-time updates
  useEffect(() => {
    if (!socket) return;
    socket.emit('joinProject', id);
    const onTasks = (p) => p.projectId === id && setTasks(p.tasks);
    const onProject = (p) => p.project._id === id && apply(p);
    const evs = ['taskCreated', 'taskMoved', 'taskUpdated', 'taskDeleted', 'newComment'];
    evs.forEach((e) => socket.on(e, onTasks));
    socket.on('projectUpdated', onProject);
    return () => { socket.emit('leaveProject', id); evs.forEach((e) => socket.off(e, onTasks)); socket.off('projectUpdated', onProject); };
  }, [socket, id, apply]);

  if (error) return <div className="p-8 text-gray-500">{error}. <Link className="text-violet-600" to="/">Back to dashboard</Link></div>;
  if (!project) return <div className="p-8 text-gray-400">Loading board…</div>;

  const byList = (lid) => tasks.filter((t) => t.list === lid).sort((a, b) => a.order - b.order);
  const run = async (fn) => { try { apply((await fn()).data); } catch (e) { alert(e.response?.data?.message || 'Action failed'); } };
  const isOwner = String(project.owner?._id || project.owner) === String(user._id);

  const onDragEnd = async ({ draggableId, source, destination }) => {
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;
    const cols = {};
    project.lists.forEach((l) => (cols[l._id] = byList(l._id).filter((t) => t._id !== draggableId)));
    const task = tasks.find((t) => t._id === draggableId);
    cols[destination.droppableId].splice(destination.index, 0, { ...task, list: destination.droppableId });
    setTasks(Object.values(cols).flatMap((arr) => arr.map((t, i) => ({ ...t, order: i }))));
    try { apply((await api.put(`/tasks/${draggableId}/move`, { list: destination.droppableId, position: destination.index })).data); }
    catch { load(); }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <Link to="/" className="text-gray-400 hover:text-violet-600">←</Link>
        <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-bold">{project.name}</h1><p className="truncate text-xs text-gray-500">{project.description}</p></div>
        <div className="flex items-center gap-1">
          {project.members.map((m) => <Avatar key={m._id} user={m} size={30} online={online.includes(m._id)} />)}
        </div>
        <div className="relative">
          <button className="btn-outline" onClick={() => setPanel(!panel)}>👥 Members</button>
          {panel && (
            <div className="card absolute right-0 z-30 mt-2 w-72 p-3">
              {project.members.map((m) => (
                <div key={m._id} className="flex items-center gap-2 py-1.5 text-sm">
                  <Avatar user={m} size={26} online={online.includes(m._id)} /><div className="min-w-0 flex-1"><div className="truncate">{m.name}</div><div className="truncate text-xs text-gray-400">{m.email}</div></div>
                  {(isOwner || m._id === user._id) && String(project.owner?._id || project.owner) !== m._id && <button className="text-xs text-red-500" onClick={() => run(() => api.delete(`/projects/${id}/members/${m._id}`))}>Remove</button>}
                </div>
              ))}
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (email.trim()) run(() => api.post(`/projects/${id}/members`, { email })).then(() => setEmail('')); }}>
                <input className="input" type="email" placeholder="Add by email" value={email} onChange={(e) => setEmail(e.target.value)} /><button className="btn-primary">Add</button>
              </form>
              <p className="mt-2 text-xs text-gray-400"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />= online now</p>
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-1 items-start gap-4 overflow-x-auto p-4 sm:p-6">
          {project.lists.map((l) => {
            const items = byList(l._id);
            return (
              <div key={l._id} className="w-72 shrink-0 rounded-xl bg-gray-100 p-3">
                <ListHeader list={l} count={items.length} onRename={(name) => run(() => api.put(`/projects/${id}/lists/${l._id}`, { name }))} onDelete={() => run(() => api.delete(`/projects/${id}/lists/${l._id}`))} />
                <Droppable droppableId={l._id}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps} className={`min-h-[40px] space-y-2 rounded-lg ${snap.isDraggingOver ? 'bg-violet-100/60' : ''}`}>
                      {items.map((t, i) => (
                        <Draggable key={t._id} draggableId={t._id} index={i}>
                          {(p, s) => <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={s.isDragging ? 'rotate-2' : ''}><Card t={t} onOpen={() => setOpenId(t._id)} /></div>}
                        </Draggable>
                      ))}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
                <div className="mt-2"><AddInline button="Add task" placeholder="Task title…" onAdd={(title) => run(() => api.post('/tasks', { project: id, list: l._id, title }))} /></div>
              </div>
            );
          })}
          <div className="w-72 shrink-0 rounded-xl bg-gray-200/60 p-3"><AddInline button="Add list" placeholder="List name…" onAdd={(name) => run(() => api.post(`/projects/${id}/lists`, { name }))} /></div>
        </div>
      </DragDropContext>
      {openId && <TaskModal taskId={openId} tasks={tasks} project={project} onApply={apply} onClose={() => setOpenId(null)} />}
    </div>
  );
}
