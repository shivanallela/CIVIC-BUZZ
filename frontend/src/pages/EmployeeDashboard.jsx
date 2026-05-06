import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const STATUS_BADGE = {
  pending: 'badge-pending',
  in_progress: 'badge-in_progress',
  resolved: 'badge-resolved',
  rejected: 'badge-rejected'
};

const STATUS_OPTIONS = [
  { value: 'pending', label: '🕐 Pending' },
  { value: 'in_progress', label: '🔧 In Progress' },
  { value: 'resolved', label: '✅ Resolved' },
  { value: 'rejected', label: '❌ Rejected' }
];

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [updating, setUpdating] = useState(null); // report id being updated
  const [noteInputs, setNoteInputs] = useState({}); // id → note text

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    setUpdating(reportId);
    try {
      const note = noteInputs[reportId] || '';
      const result = await api.updateStatus(reportId, newStatus, note);
      // Update local state
      setReports(prev => prev.map(r => r.id === reportId ? result.report : r));
      setNoteInputs(prev => ({ ...prev, [reportId]: '' }));
    } catch (err) {
      setError('Failed to update status: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  const filteredReports = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.issue_type !== filterType) return false;
    return true;
  });

  const issueTypes = [...new Set(reports.map(r => r.issue_type).filter(Boolean))];

  const firstName = user?.full_name?.split(' ')[0] || user?.username;

  return (
    <div className="page">
      <div className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-greeting">Issue Management 🏙️</h1>
          <p className="dashboard-subtitle">Welcome, {firstName} — {user?.department || 'City Employee'}</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            ⚠️ {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
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

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div className="section-title" style={{ alignSelf: 'center' }}>
            All Reports ({filteredReports.length})
          </div>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              {issueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={loadReports}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner spinner-dark" />
            <span>Loading reports...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗂️</div>
            <div className="empty-state-title">No reports found</div>
            <p className="empty-state-text">
              {filterStatus !== 'all' || filterType !== 'all'
                ? 'Try changing filters to see more reports.'
                : 'No civic issues have been reported yet.'}
            </p>
          </div>
        ) : (
          <div className="reports-list">
            {filteredReports.map(report => (
              <div key={report.id} className="card" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {report.image_path && (
                    <img
                      src={report.image_path}
                      alt={report.issue_type}
                      className="report-image"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
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
                      {report.severity && (
                        <span className={`badge badge-${report.severity}`} style={{ fontSize: '0.7rem' }}>
                          {report.severity}
                        </span>
                      )}
                    </div>

                    <div className="report-meta">
                      👤 {report.user_name || report.username} · {formatDate(report.timestamp)}
                    </div>

                    <div className="report-description" style={{ marginBottom: '8px' }}>
                      {report.description}
                    </div>

                    {report.location?.address && (
                      <div className="report-location">
                        📍 {report.location.address}
                        {report.location.source === 'exif' && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--success)', marginLeft: '4px' }}>
                            (GPS from photo)
                          </span>
                        )}
                      </div>
                    )}

                    {/* AI Analysis Details */}
                    {report.ai_analysis && (
                      <details style={{ marginTop: '8px' }}>
                        <summary style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          🤖 AI Analysis Details
                        </summary>
                        <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg)', borderRadius: '6px', fontSize: '0.8rem' }}>
                          <strong>Suggested Action:</strong> {report.ai_analysis.suggested_action || '—'}<br />
                          <strong>Confidence:</strong> {report.ai_analysis.confidence != null ? `${Math.round(report.ai_analysis.confidence * 100)}%` : '—'}
                        </div>
                      </details>
                    )}

                    {/* Status Update Controls */}
                    <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                        UPDATE STATUS
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {STATUS_OPTIONS.map(s => (
                          <button
                            key={s.value}
                            className={`btn btn-sm ${report.status === s.value ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleStatusUpdate(report.id, s.value)}
                            disabled={updating === report.id || report.status === s.value}
                          >
                            {updating === report.id && report.status !== s.value ? (
                              <span className="spinner spinner-dark" style={{ width: '12px', height: '12px' }} />
                            ) : null}
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          placeholder="Add a response note (optional)..."
                          value={noteInputs[report.id] || ''}
                          onChange={e => setNoteInputs(prev => ({ ...prev, [report.id]: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
