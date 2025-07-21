import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import PollSettings from './components/PollSettings';
import PollParticipation from './components/PollParticipation';
import PollResults from './components/PollResults';
import PublicPollResults from './components/PublicPollResults';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } />
          <Route path="/polls/:pollId/settings" element={
            <ProtectedRoute>
              <PollSettings />
            </ProtectedRoute>
          } />
          <Route path="/polls/:pollId/results" element={
            <ProtectedRoute>
              <PollResults />
            </ProtectedRoute>
          } />
          <Route path="/poll/:pollId" element={<PollParticipation />} />
          <Route path="/poll/:pollId/results/:sessionToken?" element={<PublicPollResults />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
