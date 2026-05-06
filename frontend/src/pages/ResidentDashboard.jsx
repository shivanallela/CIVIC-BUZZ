import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const STATUS_BADGE = {
  pending: 'badge-pending',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
  rejected: 'badge-rejected'
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function ResidentDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg] = useState(location.state?.success || '');

  useEffect(() => {
    api.getReports()
      .then(data => setReports(data.reports || []))
      .catch(err => setError(err.message || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'there';

  return (
    <div className="page">
      <div className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-greeting">{greeting()}, {firstName}! 👋</h1>
          <p className="dashboard-subtitle">Here's an overview of your reported issues</p>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '24px' }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Reports</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#92400E' }}>{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#1E40AF' }}>{stats.in_progress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#065F46' }}>{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        {/* Reports List */}
        <div className="section-header">
          <h2 className="section-title">My Reports</h2>
          <Link to="/report" className="btn btn-primary btn-sm">+ Report New Issue</Link>
        </div>

        {loading ? (
          <div className="loading-overlay">
            <div className="spinner spinner-dark" />
            <span>Loading your reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No reports yet</div>
            <p className="empty-state-text">
              Spotted a civic issue in your area? Report it and help improve your city!
            </p>
            <Link to="/report" className="btn btn-primary">Report an Issue</Link>
          </div>
        ) : (
          <div className="reports-list">
            {reports.map(report => (
              <div key={report.id} className="report-card">
                {report.image_path && (
                  <img
                    src={report.image_path}
                    alt={report.issue_type}
                    className="report-image"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="report-content">
                  <div className="report-header">
                    <span className="report-type">{report.issue_type}</span>
                    <span className={`badge ${STATUS_BADGE[report.status] || 'badge-pending'}`}>
                      {(report.status || 'pending').replace('_', ' ')}
                    </span>
                    {report.ai_analysis?.ai_powered && (
                      <span style={{
                        background: 'var(--primary)', color: 'white',
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px',
                        borderRadius: '100px'
                      }}>AI</span>
                    )}
                  </div>
                  <div className="report-meta">
                    {formatDate(report.timestamp)}
                    {report.severity && (
                      <span className={`badge ${report.severity === 'high' ? 'badge-high' : report.severity === 'low' ? 'badge-low' : 'badge-medium'}`} style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                        {report.severity}
                      </span>
                    )}
                  </div>
                  <div className="report-description">{report.description}</div>
                  {report.location?.address && (
                    <div className="report-location">
                      📍 {report.location.address}
                    </div>
                  )}
                  {report.review_note && (
                    <div className="alert alert-info" style={{ marginTop: '8px', padding: '8px 12px', fontSize: '0.78rem' }}>
                      💬 <strong>City response:</strong> {report.review_note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
