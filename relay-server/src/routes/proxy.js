/**
 * Proxy routes for forwarding requests to local Hue Bridge
 */

import { Router } from 'express';

const router = Router();

/**
 * Proxy all requests to /relay/api/* to the local Hue Bridge
 * Supports GET, POST, PUT, DELETE methods
 */
router.all('/api/*', async (req, res) => {
  const bridgeIp = process.env.BRIDGE_IP;

  if (!bridgeIp) {
    return res.status(500).json({ error: 'BRIDGE_IP not configured' });
  }

  // Extract the path after /relay/api
  const huePath = req.path.replace(/^\/api/, '');
  const hueUrl = `http://${bridgeIp}/api${huePath}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Include body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(hueUrl, fetchOptions);
    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(502).json({
      error: 'Failed to reach Hue Bridge',
      details: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bridgeConfigured: !!process.env.BRIDGE_IP,
    bridgeIp: process.env.BRIDGE_IP || null,
    timestamp: new Date().toISOString(),
  });
});

export default router;
