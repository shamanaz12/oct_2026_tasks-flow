import axios from 'axios';
import mock from './mock.js';

export const isDemo = () => localStorage.getItem('demo') === '1';
const real = axios.getAdapter(axios.defaults.adapter);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  adapter: (config) => (isDemo() ? mock(config) : real(config)),
});
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
export default api;
