/**
 * utils/aiAnalysis.js
 * 
 * AI-powered civic issue detection using OpenAI GPT-4o Vision API.
 * 
 * WHAT THIS DOES:
 * - Takes an uploaded image (as base64 or URL)
 * - Sends it to OpenAI Vision API
 * - Returns: issue_type, description, severity, suggested_action
 * 
 * FALLBACK: If OpenAI key is not set, returns a rule-based default.
 */

const fs = require('fs');
const path = require('path');

// Issue categories the AI classifies into
const ISSUE_CATEGORIES = [
  'Pothole',
  'Garbage/Waste',
  'Water Leakage',
  'Broken Streetlight',
  'Damaged Road',
  'Flood/Waterlogging',
  'Encroachment',
  'Fallen Tree',
  'Broken Infrastructure',
  'Graffiti/Vandalism',
  'Other'
];

/**
 * Analyze an image using OpenAI GPT-4o Vision API.
 * @param {string} imagePath - Absolute path to the uploaded image file
 * @returns {Object} { issue_type, description, severity, suggested_action }
 */
async function analyzeImage(imagePath) {
  const apiKey = process.env.OPENAI_API_KEY;

  // FALLBACK: If no API key, return a placeholder result
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    console.warn('⚠️  OPENAI_API_KEY not set — using fallback classifier');
    return fallbackAnalysis(imagePath);
  }

  try {
    // Read image file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a civic issue detection AI for a city reporting system. 
Analyze images and identify public infrastructure issues.
Always respond in valid JSON format with these exact fields:
{
  "issue_type": "<one of: ${ISSUE_CATEGORIES.join(', ')}>",
  "description": "<2-3 sentence factual description of the issue visible in the image>",
  "severity": "<low|medium|high>",
  "suggested_action": "<brief recommendation for city workers>",
  "confidence": <0.0-1.0>
}
Be concise and factual. Focus on what's visible in the image.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'low' // Use 'low' to save tokens and cost
                }
              },
              {
                type: 'text',
                text: 'Analyze this image and identify the civic issue. Respond only with the JSON object.'
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.2 // Low temperature for consistent, factual responses
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Extract JSON from response (handle markdown code blocks)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    // Validate and normalize the result
    return {
      issue_type: ISSUE_CATEGORIES.includes(result.issue_type) ? result.issue_type : 'Other',
      description: result.description || 'Civic issue detected in uploaded image.',
      severity: ['low', 'medium', 'high'].includes(result.severity) ? result.severity : 'medium',
      suggested_action: result.suggested_action || 'Inspect and address the issue.',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
      ai_powered: true
    };

  } catch (err) {
    console.error('❌ AI analysis failed:', err.message);
    // Return fallback result instead of crashing
    return {
      ...fallbackAnalysis(imagePath),
      ai_error: err.message
    };
  }
}

/**
 * Fallback analysis when OpenAI is not available.
 * Returns a generic result — admins can manually classify.
 */
function fallbackAnalysis(imagePath) {
  return {
    issue_type: 'Other',
    description: 'A civic issue has been reported. The image has been uploaded successfully. Manual classification required.',
    severity: 'medium',
    suggested_action: 'Please inspect the reported location and classify the issue.',
    confidence: 0.0,
    ai_powered: false
  };
}

module.exports = { analyzeImage, ISSUE_CATEGORIES };
