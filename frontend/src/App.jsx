import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AdminPage } from './pages/AdminPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { WorkspacePage } from './pages/WorkspacePage.jsx';

const RequireAuth = ({ children }) => {
  const { session } = useAuth();
  const location = useLocation();
  return session ? children : <Navigate to="/login" replace state={{ from: location }} />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/" element={<RequireAuth><WorkspacePage /></RequireAuth>} />
    <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
    <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);
