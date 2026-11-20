import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { isDemo } from './api';
import { useAuth } from './AuthContext.jsx';

const Ctx = createContext({});
export const useSocket = () => useContext(Ctx);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [toast, setToast] = useState('');

  const refresh = useCallback(() => api.get('/notifications').then((r) => setNotifs(r.data)).catch(() => {}), []);

  useEffect(() => {
    if (!user) { setNotifs([]); return; }
    refresh();
    if (isDemo()) { setOnline([user._id, 'u2', 'u3']); return; } // simulated presence in demo mode
    const s = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token: localStorage.getItem('token') } });
    s.on('presence', setOnline);
    s.on('notification', (n) => {
      setNotifs((l) => [n, ...l]);
      setToast(n.text);
      setTimeout(() => setToast(''), 4000);
    });
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [user?._id]);

  const markRead = (n) => { api.put(`/notifications/${n._id}/read`); setNotifs((l) => l.map((x) => (x._id === n._id ? { ...x, read: true } : x))); };
  const markAll = () => { api.put('/notifications/read-all'); setNotifs((l) => l.map((x) => ({ ...x, read: true }))); };
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <Ctx.Provider value={{ socket, online, notifs, unread, markRead, markAll, refresh }}>
      {children}
      {toast && <div className="fixed bottom-4 right-4 z-[60] max-w-xs rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">🔔 {toast}</div>}
    </Ctx.Provider>
  );
}
