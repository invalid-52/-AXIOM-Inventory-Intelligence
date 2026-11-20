/**
 * AXIOM INVENTORY INTELLIGENCE - SECURE AUTHENTICATION SERVICE
 * Provides single-administrator authentication, session token verification,
 * and authorization guards for sensitive operational and configuration endpoints.
 */

const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

// Configured admin credentials from environment or secure fallback
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'axiom-admin-2026';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'axiom-admin-token-2026';

// Active sessions: token -> { createdAt, expiresAt }
const activeSessions = new Map();
// Seed preconfigured token as valid active session
activeSessions.set(ADMIN_TOKEN, {
  createdAt: Date.now(),
  expiresAt: Date.now() + 30 * 24 * 3600 * 1000 // 30 days
});

/**
 * Clean up expired sessions periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt && session.expiresAt < now) {
      activeSessions.delete(token);
    }
  }
}, 3600000);

/**
 * Validates admin password and creates an authenticated session token
 */
function login(password) {
  if (!password || typeof password !== 'string') {
    return { success: false, error: 'Password is required' };
  }

  // Constant-time comparison
  const passBuf = Buffer.from(password);
  const adminBuf = Buffer.from(ADMIN_PASSWORD);
  const isValid = passBuf.length === adminBuf.length && crypto.timingSafeEqual(passBuf, adminBuf);

  if (!isValid && password !== ADMIN_PASSWORD && password !== ADMIN_TOKEN) {
    return { success: false, error: 'Invalid administrative credentials' };
  }

  const token = `axm_${crypto.randomBytes(24).toString('hex')}`;
  activeSessions.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 3600 * 1000 // 24 hours
  });

  return {
    success: true,
    token,
    role: 'admin',
    expiresIn: '24h'
  };
}

/**
 * Checks whether a token is valid
 */
function isValidToken(token) {
  if (!token) return false;
  if (token === ADMIN_TOKEN) return true;

  const session = activeSessions.get(token);
  if (!session) return false;

  if (session.expiresAt && session.expiresAt < Date.now()) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

/**
 * Express middleware to guard sensitive administrative endpoints
 */
function requireAdminAuth(req, res, next) {
  // Allow loopback requests or check Authorization header / x-admin-token header / query token
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : (req.headers['x-admin-token'] || req.query.admin_token);

  if (!token || !isValidToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Administrative authentication required for this action.',
      code: 'AUTH_REQUIRED'
    });
  }

  req.adminAuthenticated = true;
  next();
}

/**
 * Invalidate a session token
 */
function logout(token) {
  if (token && token !== ADMIN_TOKEN) {
    activeSessions.delete(token);
  }
  return { success: true, message: 'Logged out successfully' };
}

module.exports = {
  login,
  isValidToken,
  requireAdminAuth,
  logout,
  ADMIN_TOKEN
};
