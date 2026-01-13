/**
 * Lightify Relay Server
 *
 * Self-hosted relay that bridges requests from the Vercel-deployed
 * Lightify app to a local Philips Hue Bridge.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import proxyRoutes from './routes/proxy.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse allowed origins from environment
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Relay-Token'],
  })
);

// Parse JSON bodies
app.use(express.json());

// Health check (no auth required)
app.get('/relay/health', (req, res) => {
  res.json({
    status: 'ok',
    bridgeConfigured: !!process.env.BRIDGE_IP,
    timestamp: new Date().toISOString(),
  });
});

// All other relay routes require authentication
app.use('/relay', authMiddleware, proxyRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Lightify Relay Server running on port ${PORT}`);
  console.log(`Bridge IP: ${process.env.BRIDGE_IP || 'NOT CONFIGURED'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
