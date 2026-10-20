import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateToken04 } from './utils/zegoServerAssistant.js';

const app = express();
const PORT = process.env.PORT || 4000;
const APP_ID = parseInt(process.env.ZEGO_APP_ID, 10);
const SERVER_SECRET = process.env.ZEGO_SERVER_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin === FRONTEND_URL) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

const isConfigured = Boolean(APP_ID && !isNaN(APP_ID) && SERVER_SECRET && SERVER_SECRET.length === 32);

if (!isConfigured) {
  console.warn('⚠️  Notice: ZegoCloud credentials in .env are not configured or invalid.');
  console.warn('   Please provide ZEGO_APP_ID and ZEGO_SERVER_SECRET in backend/.env for production tokens.');
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Quick health-check endpoint
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    isConfigured,
    appIdConfigured: Boolean(APP_ID && !isNaN(APP_ID)),
  });
});

/**
 * GET /api/token?userId=<id>&roomId=<id>
 * Generates a signed ZegoCloud token for the given user.
 * Token validity: 1 hour (3600 seconds).
 */
app.get('/api/token', (req, res) => {
  const { userId, roomId } = req.query;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return res.status(400).json({ error: 'userId query param is required' });
  }
  if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
    return res.status(400).json({ error: 'roomId query param is required' });
  }

  if (!isConfigured) {
    return res.status(400).json({
      error: 'ZegoCloud APP_ID and SERVER_SECRET are not yet configured in backend/.env.',
      code: 'CREDENTIALS_MISSING',
    });
  }

  const effectiveTimeInSeconds = 3600; // 1 hour

  try {
    const token = generateToken04(
      APP_ID,
      userId.trim(),
      SERVER_SECRET,
      effectiveTimeInSeconds,
      ''
    );

    return res.json({
      token,
      userId: userId.trim(),
      roomId: roomId.trim(),
      expiresIn: effectiveTimeInSeconds,
    });
  } catch (err) {
    console.error('Token generation error:', err);
    return res.status(500).json({
      error: err.errorMessage || err.message || 'Token generation failed',
      code: err.errorCode || 500,
    });
  }
});

// ─── 404 fallback ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  ZegoMeet token server running at http://localhost:${PORT}`);
  console.log(`   AppID Configured: ${isConfigured ? APP_ID : 'Pending configuration'}`);
  console.log(`   Frontend URL    : ${FRONTEND_URL}`);
});
