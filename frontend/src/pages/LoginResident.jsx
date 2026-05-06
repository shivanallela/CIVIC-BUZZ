import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function LoginResident() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(''); // Clear error on change
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      return setError('Please enter your username and password.');
    }
    setLoading(true);
    setError('');
    try {
      // FIX: Correctly passes role: 'user' to the API
      await login(form.username.trim(), form.password, 'user');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim() || !form.full_name.trim()) {
      return setError('All fields are required.');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    setLoading(true);
    setError('');
    try {
      await api.register(form.username.trim(), form.password, form.full_name.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <div className="auth-logo-icon">📢</div>
        <div className="auth-logo-name">CivicLink</div>
        <div className="auth-logo-sub">City Services Platform</div>
      </div>

      <div className="auth-card">
        <h1 className="auth-card-title">
          {mode === 'login' ? 'Resident Sign In' : 'Create Account'}
        </h1>
        <p className="auth-card-subtitle">
          {mode === 'login' ? 'Sign in to report civic issues' : 'Join to start reporting issues'}
        </p>

        {mode === 'login' && (
          <div className="auth-demo">
            <strong>Demo credentials:</strong><br />
            Username: <strong>alice</strong> or <strong>bob</strong> · Password: <strong>user123</strong>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} noValidate>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label" htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="form-input"
                placeholder="Your full name"
                value={form.full_name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              placeholder="Enter username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              mode === 'login' ? 'Sign In as Resident' : 'Create Account'
            )}
          </button>
        </form>

        <hr className="auth-divider" />

        <div className="auth-footer">
          {mode === 'login' ? (
            <>Don't have an account? <button className="btn btn-ghost btn-sm" onClick={() => { setMode('register'); setError(''); }}>Register</button></>
          ) : (
            <>Already have an account? <button className="btn btn-ghost btn-sm" onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Back to role selection
          </Link>
        </div>
      </div>
    </div>
  );
}
