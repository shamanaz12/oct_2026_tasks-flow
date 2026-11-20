import { useNavigate } from 'react-router-dom';
import { useSocket } from '../SocketContext.jsx';
import { ago } from '../utils.js';

export default function Notifications() {
  const { notifs, markRead, markAll, unread } = useSocket();
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <div className="mb-6 flex items-center"><h1 className="flex-1 text-2xl font-bold">Notifications</h1>{unread > 0 && <button className="btn-outline" onClick={markAll}>Mark all as read</button>}</div>
      {notifs.length === 0 && <div className="card p-10 text-center text-gray-400">No notifications yet.</div>}
      <div className="space-y-2">
        {notifs.map((n) => (
          <button key={n._id} onClick={() => { markRead(n); n.link && nav(n.link); }} className={`card flex w-full items-center gap-3 p-4 text-left ${n.read ? '' : 'border-violet-200 bg-violet-50/50'}`}>
            {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-violet-600" />}
            <span className="flex-1 text-sm">{n.text}</span><span className="text-xs text-gray-400">{ago(n.createdAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
