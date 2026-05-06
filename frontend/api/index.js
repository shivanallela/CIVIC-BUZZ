/**
 * Vercel Serverless API — api/index.js
 * This is the single entry point for ALL /api/* routes on Vercel.
 * Vercel automatically serves this file at /api/*
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();

// ─── In-Memory Store ──────────────────────────────────────────────────────────
// Passwords: user123 for residents, emp123 for employees
const db = {
  users: [
    { id: 'u1', username: 'alice',  password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', role: 'user',     full_name: 'Alice Johnson',  created_at: new Date().toISOString() },
    { id: 'u2', username: 'bob',    password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', role: 'user',     full_name: 'Bob Smith',      created_at: new Date().toISOString() },
    { id: 'e1', username: 'emp01',  password_hash: '$2b$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aAdiygJJEuy', role: 'employee', full_name: 'Employee One',   department: 'Public Works', created_at: new Date().toISOString() },
    { id: 'e2', username: 'emp02',  password_hash: '$2b$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aAdiygJJEuy', role: 'employee', full_name: 'Employee Two',   department: 'Sanitation',   created_at: new Date().toISOString() }
  ],
  reports: []
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Sessions ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'civiclink-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, httpOnly: true, maxAge: 86400000, sameSite: 'none' }
}));

// ─── Multer (memory) ──────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Middleware ───────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Authentication required. Please log in.' });
  next();
}
function requireEmployee(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.session.user.role !== 'employee') return res.status(403).json({ error: 'Employee role required.' });
  next();
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    if (!role || !['user','employee'].includes(role)) return res.status(400).json({ error: 'Valid role is required' });

    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === role);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.user = { id: user.id, username: user.username, role: user.role, full_name: user.full_name, department: user.department || null };
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Session error. Please try again.' });
      res.json({ success: true, user: req.session.user, message: `Welcome, ${user.full_name}!` });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    if (!username || !password || !full_name) return res.status(400).json({ error: 'Username, password, and full name are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (role && role !== 'user') return res.status(403).json({ error: 'Employee accounts must be created by an admin' });

    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken. Please choose a different one.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = { id: uuidv4(), username: username.toLowerCase(), password_hash, role: 'user', full_name, created_at: new Date().toISOString() };
    db.users.push(newUser);

    req.session.user = { id: newUser.id, username: newUser.username, role: newUser.role, full_name: newUser.full_name };
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Registration succeeded. Please log in.' });
      res.status(201).json({ success: true, user: req.session.user, message: `Account created! Welcome, ${full_name}!` });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (req.session?.user) return res.json({ authenticated: true, user: req.session.user });
  res.status(401).json({ authenticated: false, error: 'Not authenticated' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────
app.post('/api/reports', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required.' });
    const base64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const report = {
      id: uuidv4(),
      user_id: req.session.user.id,
      username: req.session.user.username,
      user_name: req.session.user.full_name || req.session.user.username,
      issue_type: req.body.issue_type || 'Other',
      description: req.body.description || 'Civic issue reported.',
      ai_analysis: { issue_type: req.body.issue_type || 'Other', description: req.body.description || 'Manual report.', severity: 'medium', suggested_action: 'Please inspect the location.', confidence: 0, ai_powered: false },
      location: { lat: null, lng: null, address: req.body.manual_location || 'Location not specified', source: 'manual' },
      image_path: imageDataUrl,
      image_filename: req.file.originalname,
      status: 'pending',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.reports.unshift(report);
    res.status(201).json({ success: true, report, message: 'Report submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit report.' });
  }
});

app.get('/api/reports', requireAuth, (req, res) => {
  let reports = [...db.reports];
  if (req.session.user.role === 'user') reports = reports.filter(r => r.user_id === req.session.user.id);
  res.json({ success: true, reports, total: reports.length });
});

app.get('/api/reports/stats/summary', requireEmployee, (req, res) => {
  const reports = db.reports;
  const stats = {
    total: reports.length,
    by_status: { pending: reports.filter(r=>r.status==='pending').length, in_progress: reports.filter(r=>r.status==='in_progress').length, resolved: reports.filter(r=>r.status==='resolved').length, rejected: reports.filter(r=>r.status==='rejected').length },
    by_type: {},
    recent: reports.slice(0,5)
  };
  reports.forEach(r => { stats.by_type[r.issue_type] = (stats.by_type[r.issue_type]||0)+1; });
  res.json({ success: true, stats });
});

app.get('/api/reports/:id', requireAuth, (req, res) => {
  const report = db.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  if (req.session.user.role === 'user' && report.user_id !== req.session.user.id) return res.status(403).json({ error: 'Access denied' });
  res.json({ success: true, report });
});

app.patch('/api/reports/:id/status', requireEmployee, (req, res) => {
  const { status, note } = req.body;
  const valid = ['pending','in_progress','resolved','rejected'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Status must be: ${valid.join(', ')}` });
  const report = db.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  report.status = status;
  report.updated_at = new Date().toISOString();
  report.reviewed_by = req.session.user.username;
  if (note) report.review_note = note;
  res.json({ success: true, report, message: `Status updated to "${status}"` });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
