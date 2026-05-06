/**
 * CivicLink Backend — server.js
 * Vercel-compatible: uses in-memory storage (no file system writes)
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── In-Memory Store (Vercel-compatible) ─────────────────────────────────────
// Pre-hashed passwords: user123 for residents, emp123 for employees
// Hash generated with bcrypt.hash('user123', 10) and bcrypt.hash('emp123', 10)
const inMemoryDB = {
  users: [
    {
      id: 'u1',
      username: 'alice',
      password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // user123
      role: 'user',
      full_name: 'Alice Johnson',
      created_at: new Date().toISOString()
    },
    {
      id: 'u2',
      username: 'bob',
      password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // user123
      role: 'user',
      full_name: 'Bob Smith',
      created_at: new Date().toISOString()
    },
    {
      id: 'e1',
      username: 'emp01',
      password_hash: '$2b$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aAdiygJJEuy', // emp123
      role: 'employee',
      full_name: 'Employee One',
      department: 'Public Works',
      created_at: new Date().toISOString()
    },
    {
      id: 'e2',
      username: 'emp02',
      password_hash: '$2b$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aAdiygJJEuy', // emp123
      role: 'employee',
      full_name: 'Employee Two',
      department: 'Sanitation',
      created_at: new Date().toISOString()
    }
  ],
  reports: []
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Allow all origins (Vercel + localhost)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Sessions (in-memory, Vercel-compatible) ──────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'civiclink-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.VERCEL ? true : false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.VERCEL ? 'none' : 'lax'
  }
}));

// ─── Multer (memory storage — no disk writes) ─────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Invalid file type'), ok);
  }
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

function requireEmployee(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.session.user.role !== 'employee') {
    return res.status(403).json({ error: 'Access denied. Employee role required.' });
  }
  next();
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
    if (!role || !['user', 'employee'].includes(role)) return res.status(400).json({ error: 'Valid role is required' });

    const user = inMemoryDB.users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.role === role
    );
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.user = {
      id: user.id, username: user.username,
      role: user.role, full_name: user.full_name || user.username,
      department: user.department || null
    };

    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Session error. Please try again.' });
      res.json({ success: true, user: req.session.user, message: `Welcome, ${user.full_name}!` });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    if (!username || !password || !full_name) return res.status(400).json({ error: 'Username, password, and full name are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (role && role !== 'user') return res.status(403).json({ error: 'Employee accounts must be created by an admin' });

    const exists = inMemoryDB.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return res.status(409).json({ error: 'Username already taken. Please choose a different one.' });

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(), username: username.toLowerCase(),
      password_hash, role: 'user', full_name,
      created_at: new Date().toISOString()
    };
    inMemoryDB.users.push(newUser);

    req.session.user = { id: newUser.id, username: newUser.username, role: newUser.role, full_name: newUser.full_name };
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Registration succeeded but login failed. Please log in manually.' });
      res.status(201).json({ success: true, user: req.session.user, message: `Account created! Welcome, ${full_name}!` });
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  res.status(401).json({ authenticated: false, error: 'Not authenticated' });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ─── REPORTS ROUTES ───────────────────────────────────────────────────────────

// POST /api/reports
app.post('/api/reports', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required.' });

    // Convert image buffer to base64 data URL for display
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    const report = {
      id: uuidv4(),
      user_id: req.session.user.id,
      username: req.session.user.username,
      user_name: req.session.user.full_name || req.session.user.username,
      issue_type: req.body.issue_type || 'Other',
      description: req.body.description || 'Civic issue reported.',
      ai_analysis: {
        issue_type: req.body.issue_type || 'Other',
        description: req.body.description || 'Manual report submitted.',
        severity: 'medium',
        suggested_action: 'Please inspect the reported location.',
        confidence: 0,
        ai_powered: false
      },
      location: {
        lat: null, lng: null,
        address: req.body.manual_location || 'Location not specified',
        source: 'manual'
      },
      image_path: imageDataUrl,
      image_filename: req.file.originalname,
      status: 'pending',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    inMemoryDB.reports.unshift(report);
    res.status(201).json({ success: true, report, message: 'Report submitted successfully!' });
  } catch (err) {
    console.error('Report error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to submit report.' });
  }
});

// GET /api/reports
app.get('/api/reports', requireAuth, (req, res) => {
  try {
    let reports = [...inMemoryDB.reports];
    if (req.session.user.role === 'user') {
      reports = reports.filter(r => r.user_id === req.session.user.id);
    }
    res.json({ success: true, reports, total: reports.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// GET /api/reports/stats/summary
app.get('/api/reports/stats/summary', requireEmployee, (req, res) => {
  try {
    const reports = inMemoryDB.reports;
    const stats = {
      total: reports.length,
      by_status: {
        pending: reports.filter(r => r.status === 'pending').length,
        in_progress: reports.filter(r => r.status === 'in_progress').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
        rejected: reports.filter(r => r.status === 'rejected').length,
      },
      by_type: {},
      recent: reports.slice(0, 5)
    };
    reports.forEach(r => { stats.by_type[r.issue_type] = (stats.by_type[r.issue_type] || 0) + 1; });
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// GET /api/reports/:id
app.get('/api/reports/:id', requireAuth, (req, res) => {
  try {
    const report = inMemoryDB.reports.find(r => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (req.session.user.role === 'user' && report.user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load report' });
  }
});

// PATCH /api/reports/:id/status
app.patch('/api/reports/:id/status', requireEmployee, (req, res) => {
  try {
    const { status, note } = req.body;
    const valid = ['pending', 'in_progress', 'resolved', 'rejected'];
    if (!status || !valid.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });

    const report = inMemoryDB.reports.find(r => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    report.status = status;
    report.updated_at = new Date().toISOString();
    report.reviewed_by = req.session.user.username;
    if (note) report.review_note = note;

    res.json({ success: true, report, message: `Status updated to "${status}"` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), users: inMemoryDB.users.length, reports: inMemoryDB.reports.length });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Start server (local only) ────────────────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 CivicLink running on http://localhost:${PORT}`);
    console.log(`👤 Demo users: alice/user123, bob/user123, emp01/emp123, emp02/emp123\n`);
  });
}

module.exports = app;
