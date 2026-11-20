import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useSocket } from '../SocketContext.jsx';
import { Avatar } from './Avatar.jsx';
import Modal from './Modal.jsx';
import { ago } from '../utils.js';

function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const save = async (e) => { e.preventDefault(); await updateProfile({ name, avatar }); onClose(); };
  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold">Your profile</h2>
      <form onSubmit={save} className="space-y-3">
        <div className="flex items-center gap-3"><Avatar user={{ ...user, name, avatar }} size={56} /><div className="text-sm text-gray-500">{user.email}</div></div>
        <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><label className="label">Avatar image URL</label><input className="input" placeholder="https://…" value={avatar} onChange={(e) => setAvatar(e.target.value)} /></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save</button></div>
      </form>
    </Modal>
  );
}

export default function Layout() {
  const { user, logout, isDemo } = useAuth();
  const { notifs, unread, markRead, markAll, online } = useSocket();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [profile, setProfile] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();

  const item = ({ isActive }) => `flex items-center justify-between rounded-lg border-l-4 px-3 py-2 text-sm font-medium transition ${isActive ? 'border-amber-400 bg-violet-50 text-violet-800' : 'border-transparent text-gray-600 hover:bg-gray-100'}`;
  const search = (e) => { e.preventDefault(); nav(`/?q=${encodeURIComponent(q.trim())}`); };
  const icon = 'flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:bg-white/15';

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ---------- HEADER ---------- */}
      <header className="relative z-20 shrink-0 bg-gradient-to-r from-[#0b3b3c] via-[#0f5c58] to-[#14867d] text-white shadow-md">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
          <button className={`${icon} md:hidden`} onClick={() => setOpen(true)} aria-label="Menu">☰</button>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg font-extrabold text-[#0f5c58] shadow-inner">T</span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-base font-bold tracking-tight">TaskFlow</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-amber-200">Plan · Track · Ship</span>
            </span>
          </Link>
          <div className="hidden flex-1 px-4 sm:block">
            <form onSubmit={search} className="max-w-md">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍  Search projects…" className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white placeholder-teal-100/70 outline-none transition focus:border-amber-300 focus:bg-white focus:text-gray-800 focus:placeholder-gray-400" />
            </form>
          </div>
          <div className="flex-1 sm:hidden" />
          <button className="hidden rounded-full bg-amber-400 px-3.5 py-1.5 text-sm font-semibold text-[#0b3b3c] shadow transition hover:bg-amber-300 sm:block" onClick={() => nav('/?new=' + Date.now())}>+ New</button>

          <div className="relative">
            <button className={`${icon} relative`} onClick={() => setBell(!bell)} aria-label="Notifications">
              🔔{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-[#0b3b3c]">{unread}</span>}
            </button>
            {bell && (
              <div className="card absolute right-0 z-40 mt-2 w-80 max-w-[85vw] overflow-hidden text-gray-800">
                <div className="flex items-center justify-between border-b bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800">Notifications<button className="text-xs font-medium text-violet-600" onClick={markAll}>Mark all read</button></div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 && <p className="p-4 text-sm text-gray-400">You're all caught up.</p>}
                  {notifs.slice(0, 8).map((n) => (
                    <button key={n._id} onClick={() => { markRead(n); setBell(false); n.link && nav(n.link); }} className={`block w-full border-b px-4 py-3 text-left text-sm hover:bg-gray-50 ${n.read ? 'text-gray-500' : 'bg-violet-50/50 font-medium'}`}>
                      {n.text}<span className="mt-0.5 block text-xs font-normal text-gray-400">{ago(n.createdAt)}</span>
                    </button>
                  ))}
                </div>
                <button className="block w-full bg-gray-50 py-2 text-center text-xs font-medium text-violet-700 hover:bg-gray-100" onClick={() => { setBell(false); nav('/notifications'); }}>View all</button>
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-white/15" onClick={() => setProfile(true)}>
            <Avatar user={user} size={30} online />
            <span className="hidden text-sm font-medium sm:block">{user.name}</span>
          </button>
          <button className="rounded-full border border-white/30 px-3 py-1.5 text-sm font-medium transition hover:bg-white hover:text-[#0f5c58]" onClick={() => { logout(); nav('/login'); }}>Logout</button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200" />
      </header>

      {/* ---------- BODY ---------- */}
      <div className="flex min-h-0 flex-1">
        {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 transform flex-col border-r border-gray-200 bg-white p-4 transition md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Workspace</p>
          <nav className="space-y-1" onClick={() => setOpen(false)}>
            <NavLink to="/my-tasks" className={item}>✅ My Tasks</NavLink>
            <NavLink to="/" end className={item}>📁 My Projects</NavLink>
            <NavLink to="/notifications" className={item}>🔔 Notifications {unread > 0 && <span className="rounded-full bg-violet-600 px-2 text-xs text-white">{unread}</span>}</NavLink>
          </nav>
          <div className="mt-auto rounded-xl bg-gradient-to-br from-[#0b3b3c] to-[#14867d] p-4 text-white">
            <p className="text-sm font-semibold">Start something new</p>
            <p className="mt-1 text-xs text-teal-100">Create a board and invite your team by email.</p>
            <button className="mt-3 w-full rounded-lg bg-amber-400 py-1.5 text-sm font-semibold text-[#0b3b3c] hover:bg-amber-300" onClick={() => { setOpen(false); nav('/?new=' + Date.now()); }}>+ New project</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto"><Outlet /></main>
      </div>

      {/* ---------- FOOTER ---------- */}
      <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-2 text-xs text-gray-500">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} <b className="text-violet-700">TaskFlow</b> · Plan. Track. Ship.</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />{online.length} online</span>
            <span className={`rounded-full px-2 py-0.5 font-medium ${isDemo ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-700'}`}>{isDemo ? 'Demo mode' : 'Live'}</span>
            <span className="hidden sm:inline">v1.0</span>
          </span>
        </div>
      </footer>
      {profile && <ProfileModal onClose={() => setProfile(false)} />}
    </div>
  );
}
