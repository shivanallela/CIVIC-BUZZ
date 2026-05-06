import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.[0]?.toUpperCase() || '?';

  const dashboardPath = user?.role === 'employee' ? '/employee' : '/dashboard';

  return (
    <nav className="navbar">
      <Link to={dashboardPath} className="navbar-brand">
        <div className="navbar-logo">📢</div>
        <span className="navbar-name">CivicLink</span>
      </Link>

      <div className="navbar-actions">
        {user?.role === 'user' && (
          <Link to="/report" className="btn btn-primary btn-sm">
            + Report Issue
          </Link>
        )}
        <div className="navbar-user">
          <div className="avatar">{initials}</div>
          <span style={{ fontSize: '0.85rem' }}>{user?.full_name || user?.username}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
          ⎋ Logout
        </button>
      </div>
    </nav>
  );
}
