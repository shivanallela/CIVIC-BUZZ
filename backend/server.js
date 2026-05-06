/**
 * CivicLink Backend — server.js
 * 
 * FIXES APPLIED:
 * 1. Added bcrypt password hashing (was plain-text / in-memory before)
 * 2. Added file-based sessions (was in-memory, reset on Replit sleep)
 * 3. Added multer for reliable image uploads
 * 4. Added CORS properly for the Vite frontend
 * 5. Added persistent JSON-file storage for users and reports
 * 6. Added error handling middleware
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Ensure data directories exist ───────────────────────────────────────────
const BASE_DIR = process.env.VERCEL ? '/tmp' : __dirname;
const DATA_DIR = path.join(BASE_DIR, process.env.VERCEL ? '' : 'data');
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const SESSIONS_DIR = path.join(BASE_DIR, 'sessions');


[DATA_DIR, UPLOADS_DIR, SESSIONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// ─── Initialize data files if missing ────────────────────────────────────────
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

if (!fs.existsSync(USERS_FILE)) {
  // Seed demo users with bcrypt hashed passwords
  // Passwords: user123 for residents, emp123 for employees
  const bcrypt = require('bcrypt');
  const demoUsers = [
    {
      id: 'u1',
      username: 'alice',
      // hash of 'user123' — generated once and stored
      password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // bcrypt of 'password' placeholder
      role: 'user',
      full_name: 'Alice Johnson',
      created_at: new Date().toISOString()
    },
    {
      id: 'u2',
      username: 'bob',
      password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'user',
      full_name: 'Bob Smith',
      created_at: new Date().toISOString()
    },
    {
      id: 'e1',
      username: 'emp01',
      password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'employee',
      full_name: 'Employee One',
      department: 'Public Works',
      created_at: new Date().toISOString()
    },
    {
      id: 'e2',
      username: 'emp02',
      password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'employee',
      full_name: 'Employee Two',
      department: 'Sanitation',
      created_at: new Date().toISOString()
    }
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(demoUsers, null, 2));
  console.log('✅ Created users.json with demo users');
}

if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2));
  console.log('✅ Created reports.json (empty)');
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'https://civic-issue-reporter--shivanallela363.replit.app'
  ],
  credentials: true, // FIX: Allow cookies/sessions cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// FIX: Use persistent file-based sessions instead of in-memory
// This survives Replit sleep/restart cycles
app.use(session({
  store: new FileStore({
    path: SESSIONS_DIR,
    ttl: 86400, // 24 hours
    retries: 0
  }),
  secret: process.env.SESSION_SECRET || 'civiclink-secret-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ─── Static file serving ──────────────────────────────────────────────────────
// Serve uploaded images
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve React frontend build (when built)
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

// ─── API Routes ───────────────────────────────────────────────────────────────
const authRouter = require('./routes/auth');
const reportsRouter = require('./routes/reports');

app.use('/api/auth', authRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    session: !!req.session.user
  });
});

// Serve React app for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  const indexPath = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'CivicLink API running. Frontend not built yet.' });
  }
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 CivicLink Backend running on port ${PORT}`);
    console.log(`📁 Data dir: ${DATA_DIR}`);
    console.log(`🖼️  Uploads dir: ${UPLOADS_DIR}`);
    console.log(`🔐 Sessions dir: ${SESSIONS_DIR}\n`);
    
    // Re-hash demo users with correct passwords on first start
    initializeDemoUsers();
  });
}

// Export for Vercel Serverless
module.exports = app;

/**
 * FIX: Initialize demo users with properly hashed passwords.
 * This runs once on startup to ensure the demo credentials work.
 * Credentials: alice/user123, bob/user123, emp01/emp123, emp02/emp123
 */
async function initializeDemoUsers() {
  const bcrypt = require('bcrypt');
  
  const demoSetup = [
    { username: 'alice', password: 'user123', role: 'user', full_name: 'Alice Johnson', id: 'u1' },
    { username: 'bob', password: 'user123', role: 'user', full_name: 'Bob Smith', id: 'u2' },
    { username: 'emp01', password: 'emp123', role: 'employee', full_name: 'Employee One', department: 'Public Works', id: 'e1' },
    { username: 'emp02', password: 'emp123', role: 'employee', full_name: 'Employee Two', department: 'Sanitation', id: 'e2' },
  ];

  try {
    let users = [];
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }

    let changed = false;
    for (const demo of demoSetup) {
      const existing = users.find(u => u.username === demo.username);
      if (!existing) {
        const hash = await bcrypt.hash(demo.password, 10);
        users.push({
          id: demo.id,
          username: demo.username,
          password_hash: hash,
          role: demo.role,
          full_name: demo.full_name,
          department: demo.department,
          created_at: new Date().toISOString()
        });
        changed = true;
        console.log(`✅ Created demo user: ${demo.username} (${demo.role})`);
      } else {
        // Verify the hash is valid (not the placeholder)
        const isPlaceholder = existing.password_hash === '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
        if (isPlaceholder) {
          const hash = await bcrypt.hash(demo.password, 10);
          existing.password_hash = hash;
          changed = true;
          console.log(`🔄 Updated hash for: ${demo.username}`);
        }
      }
    }

    if (changed) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      console.log('✅ Demo users initialized with correct password hashes');
    }
  } catch (err) {
    console.error('❌ Failed to initialize demo users:', err.message);
  }
}
