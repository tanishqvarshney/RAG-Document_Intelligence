/**
 * App.jsx — Root application component
 * 
 * Handles:
 * - Authentication state (login screen vs. main app)
 * - Toast notification system
 * - Unauthorized event listener (triggers logout)
 * - Layout: Sidebar + Chat area
 */

import { useState, useEffect, useCallback } from 'react';
import { authAPI } from './api/client';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import './index.css';

// ── Toast Manager ─────────────────────────────────────────────────────────────
export let addToast = () => {};  // will be overwritten below

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(username, password);
      const { access_token, username: user } = res.data;
      localStorage.setItem('documind_token', access_token);
      localStorage.setItem('documind_user', user);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🧠</div>
          <div>
            <h1>DocuMind</h1>
            <p className="login-subtitle">AI-Powered Document Intelligence</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {error && <div className="error-banner">{error}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="input"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block' }}>⚙️</span> Signing in...
              </>
            ) : (
              '→ Sign In'
            )}
          </button>
          <div className="login-hint">
            Demo credentials: <strong>admin / admin123</strong> or <strong>demo / demo123</strong>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem('documind_user'));
  const [toasts, setToasts] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [refreshDocs, setRefreshDocs] = useState(0);

  // Expose addToast globally so any component can show notifications
  addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Listen for 401 unauthorized events from the API client
  useEffect(() => {
    const handler = () => {
      setUser(null);
      addToast('Session expired. Please log in again.', 'error');
    };
    window.addEventListener('unauthorized', handler);
    return () => window.removeEventListener('unauthorized', handler);
  }, []);

  const handleLogin = (username) => {
    setUser(username);
    addToast(`Welcome back, ${username}! 🎉`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('documind_token');
    localStorage.removeItem('documind_user');
    setUser(null);
  };

  const handleDocumentUploaded = () => {
    setRefreshDocs((n) => n + 1);
    addToast('Document indexed successfully! You can now ask questions about it.', 'success');
  };

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  return (
    <>
      <div className="app-layout">
        <Sidebar
          user={user}
          onLogout={handleLogout}
          selectedDocIds={selectedDocIds}
          onSelectionChange={setSelectedDocIds}
          onDocumentUploaded={handleDocumentUploaded}
          refreshTrigger={refreshDocs}
        />
        <ChatInterface
          user={user}
          selectedDocIds={selectedDocIds}
        />
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
