import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginEmployee() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      return setError('Please enter your employee credentials.');
    }
    setLoading(true);
    setError('');
    try {
      // FIX: Correctly passes role: 'employee'
      await login(form.username.trim(), form.password, 'employee');
      navigate('/employee');
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
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
        <h1 className="auth-card-title">City Employee Sign In</h1>
        <p className="auth-card-subtitle">Access the issue management dashboard</p>

        <div className="auth-demo">
          <strong>Demo credentials:</strong><br />
          Username: <strong>emp01</strong> or <strong>emp02</strong> · Password: <strong>emp123</strong>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="emp-username">Employee Username</label>
            <input
              id="emp-username"
              name="username"
              type="text"
              className="form-input"
              placeholder="Enter employee username"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="emp-password">Password</label>
            <input
              id="emp-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          <button
            id="employee-login-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> Signing in...</>
            ) : (
              'Sign In as City Employee'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Back to role selection
          </Link>
        </div>
      </div>
    </div>
  );
}
