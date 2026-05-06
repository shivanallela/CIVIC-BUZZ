/**
 * routes/reports.js
 * 
 * Report CRUD API routes.
 * 
 * FEATURES:
 * - POST /api/reports — Submit a new report (with image upload, AI analysis, location)
 * - GET /api/reports — Get reports (all for employees, own for residents)
 * - GET /api/reports/:id — Get single report
 * - PATCH /api/reports/:id/status — Update report status (employees only)
 * - GET /api/reports/analyze — Analyze image without submitting (preview AI results)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { analyzeImage } = require('../utils/aiAnalysis');
const { extractLocationFromImage, parseManualLocation } = require('../utils/exifLocation');
const authRouter = require('./auth');

const BASE_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '..');
const REPORTS_FILE = path.join(BASE_DIR, process.env.VERCEL ? 'reports.json' : 'data/reports.json');
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');

// ─── Multer Configuration ──────────────────────────────────────────────────────
// FIX: Properly configured multer with file type validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Safe filename: uuid + original extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // FIX: Validate file types properly
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
    const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowedTypes.test(file.mimetype.split('/')[1]);

    if (extOk && mimeOk) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, and HEIC images are allowed.'));
    }
  }
});

// ─── Helper: Read reports ─────────────────────────────────────────────────────
function readReports() {
  try {
    if (!fs.existsSync(REPORTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// ─── Helper: Write reports ────────────────────────────────────────────────────
function writeReports(reports) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

// ─── POST /api/reports ────────────────────────────────────────────────────────
/**
 * Submit a new civic issue report.
 * Accepts multipart/form-data with:
 *   - image (file, required)
 *   - description (string, optional — AI generates if not provided)
 *   - manual_location (string, optional — used if no GPS in EXIF)
 *   - issue_type (string, optional — AI detects if not provided)
 */
router.post('/', authRouter.requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required. Please upload a photo of the issue.' });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    console.log(`📸 Processing report from ${req.session.user.username}...`);

    // Run AI analysis and EXIF extraction in parallel for speed
    const [aiResult, exifLocation] = await Promise.all([
      analyzeImage(imagePath),
      extractLocationFromImage(imagePath)
    ]);

    // Determine location: EXIF GPS → manual input → null
    let location = exifLocation;
    if (!location && req.body.manual_location) {
      location = parseManualLocation(req.body.manual_location);
    }

    // Build the report object with ALL required fields
    const report = {
      id: uuidv4(),
      user_id: req.session.user.id,
      username: req.session.user.username,
      user_name: req.session.user.full_name || req.session.user.username,

      // Issue classification (AI or user-provided)
      issue_type: req.body.issue_type || aiResult.issue_type,
      
      // Description (user override → AI generated → fallback)
      description: req.body.description || aiResult.description,
      
      // AI metadata
      ai_analysis: {
        issue_type: aiResult.issue_type,
        description: aiResult.description,
        severity: aiResult.severity,
        suggested_action: aiResult.suggested_action,
        confidence: aiResult.confidence,
        ai_powered: aiResult.ai_powered
      },

      // Location data
      location: location || {
        lat: null,
        lng: null,
        address: req.body.manual_location || 'Location not specified',
        source: 'unknown'
      },

      // Image
      image_path: imageUrl,
      image_filename: req.file.filename,

      // Status
      status: 'pending',
      severity: aiResult.severity || 'medium',
      
      // Timestamps
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to persistent file
    const reports = readReports();
    reports.unshift(report); // Add to beginning (newest first)
    writeReports(reports);

    console.log(`✅ Report created: ${report.id} (${report.issue_type})`);

    res.status(201).json({
      success: true,
      report,
      message: 'Report submitted successfully!'
    });

  } catch (err) {
    // Clean up uploaded file if processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('❌ Report submission error:', err.message);
    res.status(500).json({ 
      error: err.message || 'Failed to submit report. Please try again.' 
    });
  }
});

// ─── GET /api/reports/analyze ─────────────────────────────────────────────────
/**
 * Analyze an image without saving a report (used for live preview).
 * Returns AI classification + location data.
 */
router.post('/analyze', authRouter.requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image required for analysis' });
    }

    const imagePath = req.file.path;

    const [aiResult, exifLocation] = await Promise.all([
      analyzeImage(imagePath),
      extractLocationFromImage(imagePath)
    ]);

    // Clean up temp file after analysis (not saving to DB)
    // Keep it for 5 minutes in case user submits the form
    setTimeout(() => {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }, 5 * 60 * 1000);

    res.json({
      success: true,
      filename: req.file.filename,
      image_url: `/uploads/${req.file.filename}`,
      ai_analysis: aiResult,
      location: exifLocation || null,
      has_gps: !!exifLocation
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// ─── GET /api/reports ─────────────────────────────────────────────────────────
/**
 * Get reports:
 * - City Employees: see ALL reports
 * - Residents: see only THEIR own reports
 */
router.get('/', authRouter.requireAuth, (req, res) => {
  try {
    let reports = readReports();

    if (req.session.user.role === 'user') {
      // Residents only see their own reports
      reports = reports.filter(r => r.user_id === req.session.user.id);
    }
    // Employees see all reports (no filter)

    // Sort by timestamp descending (newest first)
    reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      reports,
      total: reports.length
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// ─── GET /api/reports/:id ─────────────────────────────────────────────────────
router.get('/:id', authRouter.requireAuth, (req, res) => {
  try {
    const reports = readReports();
    const report = reports.find(r => r.id === req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Residents can only view their own report
    if (req.session.user.role === 'user' && report.user_id !== req.session.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, report });

  } catch (err) {
    res.status(500).json({ error: 'Failed to load report' });
  }
});

// ─── PATCH /api/reports/:id/status ───────────────────────────────────────────
/**
 * Update report status (employees only).
 * Valid statuses: pending → in_progress → resolved → rejected
 */
router.patch('/:id/status', authRouter.requireEmployee, (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const reports = readReports();
    const reportIdx = reports.findIndex(r => r.id === req.params.id);

    if (reportIdx === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    reports[reportIdx].status = status;
    reports[reportIdx].updated_at = new Date().toISOString();
    reports[reportIdx].reviewed_by = req.session.user.username;
    if (note) reports[reportIdx].review_note = note;

    writeReports(reports);

    console.log(`🔄 Report ${req.params.id} status → ${status} by ${req.session.user.username}`);

    res.json({ 
      success: true, 
      report: reports[reportIdx],
      message: `Status updated to "${status}"`
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ─── GET /api/reports/stats/summary ──────────────────────────────────────────
/**
 * Get report statistics (employees only).
 */
router.get('/stats/summary', authRouter.requireEmployee, (req, res) => {
  try {
    const reports = readReports();
    
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

    // Count by issue type
    reports.forEach(r => {
      stats.by_type[r.issue_type] = (stats.by_type[r.issue_type] || 0) + 1;
    });

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ─── Error handler for multer ─────────────────────────────────────────────────
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
