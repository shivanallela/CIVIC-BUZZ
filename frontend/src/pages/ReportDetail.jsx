import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function ReportDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getReport(id)
      .then(data => setReport(data.report))
      .catch(err => setError(err.message || 'Report not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const backPath = user?.role === 'employee' ? '/employee' : '/dashboard';

  if (loading) return (
    <div className="loading-overlay" style={{ minHeight: '60vh' }}>
      <div className="spinner spinner-dark" />
      <span>Loading report...</span>
    </div>
  );

  if (error || !report) return (
    <div className="dashboard" style={{ maxWidth: '700px' }}>
      <div className="alert alert-error">{error || 'Report not found'}</div>
      <Link to={backPath} className="btn btn-outline" style={{ marginTop: '12px' }}>← Back</Link>
    </div>
  );

  return (
    <div className="page">
      <div className="report-form-page">
        <Link to={backPath} className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}>← Back</Link>
        
        <div className="card">
          {report.image_path && (
            <img
              src={report.image_path}
              alt={report.issue_type}
              style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }}
            />
          )}

          <h1 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '12px' }}>
            {report.issue_type}
          </h1>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span className={`badge badge-${report.status}`}>
              {(report.status || 'pending').replace('_', ' ')}
            </span>
            {report.severity && (
              <span className={`badge badge-${report.severity}`}>{report.severity}</span>
            )}
            {report.ai_analysis?.ai_powered && (
              <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>AI Classified</span>
            )}
          </div>

          <div style={{ fontSize: '0.875rem', marginBottom: '16px' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
              Reported by {report.user_name || report.username} · {new Date(report.timestamp).toLocaleString()}
            </p>
          </div>

          <p style={{ marginBottom: '16px' }}>{report.description}</p>

          {report.location && (
            <div className="location-card" style={{ marginBottom: '16px' }}>
              <span>📍</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{report.location.address}</div>
                {report.location.lat && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {report.location.lat}, {report.location.lng}
                  </div>
                )}
              </div>
            </div>
          )}

          {report.ai_analysis && (
            <div className="ai-result-card">
              <div className="ai-result-header">
                <span style={{ fontWeight: 600 }}>🤖 AI Analysis</span>
              </div>
              <p style={{ fontSize: '0.85rem' }}><strong>Suggested Action:</strong> {report.ai_analysis.suggested_action}</p>
              {report.ai_analysis.confidence != null && (
                <p style={{ fontSize: '0.85rem' }}><strong>AI Confidence:</strong> {Math.round(report.ai_analysis.confidence * 100)}%</p>
              )}
            </div>
          )}

          {report.review_note && (
            <div className="alert alert-info" style={{ marginTop: '12px' }}>
              💬 <strong>City Response:</strong> {report.review_note}
              {report.reviewed_by && <span style={{ marginLeft: '8px', fontSize: '0.75rem' }}>— {report.reviewed_by}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
