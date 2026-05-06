import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

const ISSUE_TYPES = [
  'Pothole', 'Garbage/Waste', 'Water Leakage', 'Broken Streetlight',
  'Damaged Road', 'Flood/Waterlogging', 'Encroachment', 'Fallen Tree',
  'Broken Infrastructure', 'Graffiti/Vandalism', 'Other'
];

const SEVERITY_COLORS = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low'
};

export default function ReportIssue() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload'); // 'upload' | 'details' | 'submitting' | 'done'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState(null);

  const [form, setForm] = useState({
    issue_type: '',
    description: '',
    manual_location: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleImageSelect = useCallback(async (file) => {
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
    if (!validTypes.some(t => file.type.startsWith('image/'))) {
      return setError('Please select a valid image file (JPEG, PNG, GIF, WEBP, or HEIC).');
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return setError('Image must be less than 10MB.');
    }

    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setAnalyzing(true);
    setAiResult(null);
    setLocationData(null);

    // Send to AI analysis endpoint
    try {
      const formData = new FormData();
      formData.append('image', file);

      const result = await api.analyzeImage(formData);

      setAiResult(result.ai_analysis);
      setLocationData(result.location);
      setUploadedFilename(result.filename);

      // Pre-fill form with AI results (user can edit)
      setForm(f => ({
        ...f,
        issue_type: result.ai_analysis?.issue_type || '',
        description: result.ai_analysis?.description || ''
      }));

      setStep('details');
    } catch (err) {
      setError('Image uploaded but AI analysis failed: ' + err.message);
      setStep('details'); // Still allow submission
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAiResult(null);
    setLocationData(null);
    setUploadedFilename(null);
    setStep('upload');
    setForm({ issue_type: '', description: '', manual_location: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile && !uploadedFilename) {
      return setError('Please upload an image of the issue.');
    }
    if (!form.issue_type) {
      return setError('Please select an issue type.');
    }
    if (!form.description.trim()) {
      return setError('Please provide a description of the issue.');
    }
    if (!locationData && !form.manual_location.trim()) {
      return setError('Please provide the location of the issue.');
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      if (imageFile) formData.append('image', imageFile);
      formData.append('issue_type', form.issue_type);
      formData.append('description', form.description.trim());
      if (form.manual_location.trim()) {
        formData.append('manual_location', form.manual_location.trim());
      }

      const result = await api.submitReport(formData);
      navigate('/dashboard', { state: { success: 'Report submitted successfully!' } });
    } catch (err) {
      setError('Submission failed: ' + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="report-form-page">
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: '12px' }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Report a Civic Issue</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Upload a photo — our AI will automatically detect the issue type and location
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center' }}>
          <StepBadge num={1} label="Upload" active={step === 'upload'} done={step === 'details'} />
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <StepBadge num={2} label="Details" active={step === 'details'} done={false} />
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: Image Upload */}
        {step === 'upload' && (
          <div className="card">
            {analyzing ? (
              <div className="loading-overlay" style={{ minHeight: '200px' }}>
                <div className="spinner spinner-dark" />
                <span>🤖 Analyzing image with AI...</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                  Detecting issue type and extracting location
                </span>
              </div>
            ) : (
              <div
                className="image-upload-area"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="image-upload-icon">📸</div>
                <div className="image-upload-text">
                  <strong>Click to upload</strong> or drag and drop
                </div>
                <div className="image-upload-hint">
                  JPEG, PNG, WEBP, HEIC · Max 10MB
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* Step 2: Details Form */}
        {step === 'details' && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Image Preview */}
            {imagePreview && (
              <div className="image-preview" style={{ marginBottom: '20px' }}>
                <img src={imagePreview} alt="Issue preview" />
                <button
                  type="button"
                  className="image-preview-remove"
                  onClick={handleRemoveImage}
                  title="Remove image"
                >✕</button>
              </div>
            )}

            {/* AI Results Card */}
            {aiResult && (
              <div className="ai-result-card">
                <div className="ai-result-header">
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>🤖 AI Analysis</span>
                  {aiResult.ai_powered ? (
                    <span className="ai-badge">AI</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(manual classification needed)</span>
                  )}
                </div>
                <div className="ai-result-grid">
                  <div className="ai-result-item">
                    <label>Detected Type</label>
                    <p>{aiResult.issue_type || '—'}</p>
                  </div>
                  <div className="ai-result-item">
                    <label>Severity</label>
                    <p>
                      <span className={`badge ${SEVERITY_COLORS[aiResult.severity] || 'badge-medium'}`}>
                        {aiResult.severity || 'medium'}
                      </span>
                    </p>
                  </div>
                </div>
                {aiResult.suggested_action && (
                  <div style={{ marginTop: '10px' }}>
                    <div className="ai-result-item">
                      <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>Suggested Action</label>
                      <p style={{ fontSize: '0.8rem', marginTop: '2px' }}>{aiResult.suggested_action}</p>
                    </div>
                  </div>
                )}
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                  ✏️ You can edit the fields below to correct any AI errors.
                </p>
              </div>
            )}

            {/* Location from EXIF */}
            {locationData && (
              <div className="location-card">
                <span style={{ fontSize: '1.1rem' }}>📍</span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46' }}>
                    Location detected from photo
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                    {locationData.address}
                  </div>
                  {locationData.lat && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {locationData.lat.toFixed(5)}, {locationData.lng.toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Issue Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="issue_type">Issue Type *</label>
              <select
                id="issue_type"
                className="form-select"
                value={form.issue_type}
                onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}
                required
              >
                <option value="">Select issue type...</option>
                {ISSUE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="description">Description *</label>
              <textarea
                id="description"
                className="form-textarea"
                placeholder="Describe the issue in detail..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                required
              />
              <div className="form-hint">AI has pre-filled this — edit if needed</div>
            </div>

            {/* Manual Location (shown when no EXIF GPS) */}
            {!locationData && (
              <div className="form-group">
                <label className="form-label" htmlFor="manual_location">
                  Location *
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>
                    (no GPS found in photo)
                  </span>
                </label>
                <input
                  id="manual_location"
                  type="text"
                  className="form-input"
                  placeholder="e.g. MG Road, Bangalore or 12.97, 77.59"
                  value={form.manual_location}
                  onChange={e => setForm(f => ({ ...f, manual_location: e.target.value }))}
                />
                <div className="form-hint">Enter address or coordinates (lat, lng)</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-outline" onClick={handleRemoveImage}>
                ← Change Photo
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? (
                  <><span className="spinner" /> Submitting...</>
                ) : (
                  '✓ Submit Report'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function StepBadge({ num, label, active, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--border)',
        color: active || done ? 'white' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: '700', flexShrink: 0
      }}>
        {done ? '✓' : num}
      </div>
      <span style={{
        fontSize: '0.8rem', fontWeight: active ? '600' : '400',
        color: active ? 'var(--text)' : 'var(--text-muted)'
      }}>{label}</span>
    </div>
  );
}
