/**
 * utils/exifLocation.js
 * 
 * Extract GPS coordinates from image EXIF metadata using the 'exifr' library.
 * Then reverse geocode to a human-readable address using OpenStreetMap Nominatim (FREE).
 * 
 * WHY THIS IS NEEDED:
 * - Photos taken on smartphones contain GPS coordinates in EXIF metadata
 * - Extracting these removes the need for users to manually type location
 * - Falls back to manual input if GPS is not present
 */

const exifr = require('exifr');
const fs = require('fs');

/**
 * Extract GPS location from image EXIF metadata.
 * @param {string} imagePath - Absolute path to the image file
 * @returns {Object|null} { lat, lng, address } or null if no GPS data
 */
async function extractLocationFromImage(imagePath) {
  try {
    // Check file exists
    if (!fs.existsSync(imagePath)) {
      console.warn('⚠️  Image file not found for EXIF extraction:', imagePath);
      return null;
    }

    // Extract GPS data using exifr (handles JPEG, HEIC, TIFF, etc.)
    const gps = await exifr.gps(imagePath);

    if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
      console.log('📍 No GPS data found in image EXIF');
      return null;
    }

    const { latitude, longitude } = gps;
    console.log(`📍 GPS found: ${latitude}, ${longitude}`);

    // Reverse geocode to get human-readable address
    const address = await reverseGeocode(latitude, longitude);

    return {
      lat: parseFloat(latitude.toFixed(6)),
      lng: parseFloat(longitude.toFixed(6)),
      address: address,
      source: 'exif'
    };

  } catch (err) {
    // Don't crash — just log and return null to trigger manual input fallback
    console.error('❌ EXIF extraction error:', err.message);
    return null;
  }
}

/**
 * Reverse geocode lat/lng to a human-readable address.
 * Uses OpenStreetMap Nominatim — completely FREE, no API key needed.
 * 
 * Rate limit: 1 request/second (we add a small delay to be respectful)
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string} Human-readable address
 */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        // Required by Nominatim usage policy: identify your app
        'User-Agent': 'CivicLink/1.0 (civic-issue-reporter; contact@civiclink.app)'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.display_name) {
      // Format: "Street, Area, City, State, Country"
      const addr = data.address || {};
      const parts = [
        addr.road || addr.street,
        addr.suburb || addr.neighbourhood || addr.quarter,
        addr.city || addr.town || addr.village || addr.county,
        addr.state,
        addr.country
      ].filter(Boolean);
      
      return parts.length > 0 ? parts.join(', ') : data.display_name;
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  } catch (err) {
    console.error('❌ Reverse geocoding failed:', err.message);
    // Return coordinates as fallback
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

/**
 * Validate and parse manually-entered location string.
 * Accepts: "12.9716, 77.5946" or "MG Road, Bangalore" 
 */
function parseManualLocation(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') return null;
  
  const str = locationStr.trim();
  
  // Try to parse as coordinates "lat, lng"
  const coordMatch = str.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, address: str, source: 'manual_coords' };
    }
  }

  // Treat as address string
  return { lat: null, lng: null, address: str, source: 'manual_address' };
}

module.exports = { extractLocationFromImage, reverseGeocode, parseManualLocation };
