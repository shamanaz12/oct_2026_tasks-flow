import { createContext, useContext, useEffect, useState } from 'react';
import api, { isDemo } from './api';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) { setLoading(false); return; }
    api.get('/auth/me').then((r) => setUser(r.data))
      .catch((e) => { if (e.response?.status === 401) localStorage.removeItem('token'); })
      .finally(() => setLoading(false));
  }, []);

  const start = (data) => { localStorage.setItem('token', data.token); setUser(data.user); };
  const demo = async () => {
    localStorage.setItem('demo', '1');
    start((await api.post('/auth/login', {})).data);
  };
  // If the backend is unreachable (no response at all), fall back to demo mode automatically.
  const submit = (path) => async (body) => {
    try { start((await api.post(path, body)).data); }
    catch (e) { if (e.response) throw e; await demo(); }
  };
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('demo'); setUser(null); };
  const updateProfile = async (body) => setUser((await api.put('/auth/me', body)).data);

  return (
    <Ctx.Provider value={{ user, loading, login: submit('/auth/login'), register: submit('/auth/register'), demo, logout, updateProfile, isDemo: isDemo() }}>
      {children}
    </Ctx.Provider>
  );
}
