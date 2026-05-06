/**
 * routes/auth.js
 * 
 * FIXES:
 * 1. Was: in-memory user array → reset on restart → all logins fail
 *    Now: reads from persistent users.json file
 * 
 * 2. Was: plain-text password comparison (or broken logic)
 *    Now: bcrypt.compare() for secure password verification
 * 
 * 3. Was: no proper session management
 *    Now: express-session with file store, proper login/logout
 * 
 * 4. Was: role validation missing/broken
 *    Now: validates role field, returns 400 if missing
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// ─── Helper: Read users from file ────────────────────────────────────────────
function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ Failed to read users.json:', err.message);
    return [];
  }
}

// ─── Helper: Write users to file ─────────────────────────────────────────────
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * FIX: Was returning 401 for all users because:
 *  - Users stored in memory were reset on Replit sleep
 *  - Role field validation was broken
 *  - Password comparison was not working
 * 
 * Now reads from persistent file, validates role, uses bcrypt.
 */
router.post('/login', async (req, res) => {
  try {
    // FIX: Validate all required fields with clear error messages
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!role) {
      return res.status(400).json({ error: 'Role is required (user or employee)' });
    }
    if (!['user', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "employee"' });
    }

    // FIX: Read from persistent file (not in-memory array that resets)
    const users = readUsers();
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.role === role
    );

    if (!user) {
      // Generic message to prevent username enumeration
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // FIX: Use bcrypt.compare() for secure password verification
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // FIX: Store user in session (persistent file-based session)
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name || user.username,
      department: user.department || null
    };

    // Save session explicitly before responding
    req.session.save(err => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Session error. Please try again.' });
      }
      
      console.log(`✅ Login: ${username} (${role})`);
      res.json({
        success: true,
        user: req.session.user,
        message: `Welcome, ${user.full_name || username}!`
      });
    });

  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Allows new user registration with hashed passwords.
 * Employees can only be created by existing employees (not open registration).
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;

    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password, and full name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    // Only allow resident registration via this public endpoint
    if (role && role !== 'user') {
      return res.status(403).json({ error: 'Employee accounts must be created by an admin' });
    }

    const users = readUsers();
    const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken. Please choose a different one.' });
    }

    // Hash password before storing
    const password_hash = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username: username.toLowerCase(),
      password_hash,
      role: 'user',
      full_name,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    // Auto-login after registration
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      full_name: newUser.full_name
    };

    req.session.save(err => {
      if (err) {
        return res.status(500).json({ error: 'Registration succeeded but could not log in. Please log in manually.' });
      }
      console.log(`✅ Registered: ${username}`);
      res.status(201).json({
        success: true,
        user: req.session.user,
        message: `Account created! Welcome, ${full_name}!`
      });
    });

  } catch (err) {
    console.error('❌ Registration error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * FIX: Was always returning 401 because sessions weren't persisting.
 * Now works because sessions are stored in files (session-file-store).
 */
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ 
      authenticated: true,
      user: req.session.user 
    });
  }
  res.status(401).json({ 
    authenticated: false,
    error: 'Not authenticated' 
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const username = req.session?.user?.username;
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    console.log(`👋 Logout: ${username}`);
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// ─── Middleware: requireAuth ──────────────────────────────────────────────────
// Export for use in other route files
router.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
};

router.requireEmployee = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.session.user.role !== 'employee') {
    return res.status(403).json({ error: 'Access denied. Employee role required.' });
  }
  next();
};

module.exports = router;
