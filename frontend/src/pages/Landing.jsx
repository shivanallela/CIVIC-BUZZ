import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-logo">
        <div className="landing-logo-icon">📢</div>
        <div className="landing-logo-name">CivicLink</div>
        <div className="landing-logo-sub">City Services Platform</div>
      </div>

      <p className="landing-label">Sign in as</p>

      <div className="role-cards">
        <Link to="/login/user" className="role-card" id="resident-btn">
          <div className="role-card-icon">👤</div>
          <div className="role-card-text">
            <h3>Resident</h3>
            <p>Report a public issue in your neighbourhood</p>
          </div>
          <span className="role-card-arrow">→</span>
        </Link>

        <Link to="/login/employee" className="role-card" id="employee-btn">
          <div className="role-card-icon">🏢</div>
          <div className="role-card-text">
            <h3>City Employee</h3>
            <p>Review and manage all submitted reports</p>
          </div>
          <span className="role-card-arrow">→</span>
        </Link>
      </div>

      <p style={{ marginTop: '48px', fontSize: '0.78rem', color: 'var(--text-light)' }}>
        © 2026 CivicLink · City Services
      </p>
    </div>
  );
}
