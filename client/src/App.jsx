import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Board from './pages/Board.jsx';
import MyTasks from './pages/MyTasks.jsx';
import Notifications from './pages/Notifications.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center text-gray-400">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<Board />} />
        <Route path="/my-tasks" element={<MyTasks />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
