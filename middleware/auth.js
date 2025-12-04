const crypto = require('crypto');

// Session storage (in-memory for simplicity)
const sessions = new Map();

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Auth middleware for admin routes
function requireAuth(req, res, next) {
  const sessionToken = req.cookies?.session;

  if (!sessionToken || !sessions.has(sessionToken)) {
    return res.redirect('/admin');
  }

  // Check session expiry (24 hours)
  const session = sessions.get(sessionToken);
  if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
    sessions.delete(sessionToken);
    return res.redirect('/admin');
  }

  next();
}

// Create session
function createSession() {
  const token = generateSessionToken();
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

// Destroy session
function destroySession(token) {
  sessions.delete(token);
}

// Verify password
function verifyPassword(password) {
  return password === process.env.ADMIN_PASSWORD;
}

module.exports = {
  requireAuth,
  createSession,
  destroySession,
  verifyPassword
};
