/**
 * Authentication middleware for relay server
 * Validates X-Relay-Token header against configured secret
 */

export function authMiddleware(req, res, next) {
  const token = req.headers['x-relay-token'];
  const secret = process.env.RELAY_SECRET;

  if (!secret) {
    console.error('RELAY_SECRET not configured');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing X-Relay-Token header' });
  }

  if (token !== secret) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
}
