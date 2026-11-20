import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

function AuthForm({ mode }) {
  const { user, login, register, demo } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await (isLogin ? login({ email: f.email, password: f.password }) : register(f)); nav('/'); }
    catch (x) { setErr(x.response?.data?.message || 'Something went wrong'); }
    setBusy(false);
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-teal-50 via-white to-amber-50 p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#0b3b3c] to-[#14867d] text-2xl font-bold text-white shadow-md">T</div>
          <h1 className="text-2xl font-bold">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-sm text-gray-500">TaskFlow – plan, track and ship together</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {!isLogin && <div><label className="label">Name</label><input className="input" value={f.name} onChange={set('name')} required /></div>}
          <div><label className="label">Email</label><input type="email" className="input" value={f.email} onChange={set('email')} required /></div>
          <div><label className="label">Password</label><input type="password" minLength={6} className="input" value={f.password} onChange={set('password')} required /></div>
          {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}</button>
        </form>
        <button className="btn-outline mt-3 w-full" onClick={async () => { await demo(); nav('/'); }}>Try demo (no backend needed)</button>
        <p className="mt-4 text-center text-sm text-gray-500">
          {isLogin ? <>No account? <Link className="font-medium text-violet-600" to="/register">Sign up</Link></> : <>Have an account? <Link className="font-medium text-violet-600" to="/login">Log in</Link></>}
        </p>
        {isLogin && <p className="mt-2 text-center text-xs text-gray-400">Seeded users: ali@demo.com / password123</p>}
      </div>
    </div>
  );
}
export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
