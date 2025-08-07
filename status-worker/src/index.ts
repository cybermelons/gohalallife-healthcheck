import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authenticate } from './auth';
import { dbHealth } from './handlers/db';
import { ftsHealth } from './handlers/fts';
import { performanceHealth } from './handlers/performance';
import { allHealth } from './handlers/all';

export interface Env {
  DB: D1Database;
  API_KEY?: string;
  ALLOWED_IPS?: string;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key'],
}));

// Authentication middleware for protected endpoints
app.use('/health/*', authenticate);

// Health check endpoints
app.get('/health/db', dbHealth);
app.get('/health/fts', ftsHealth);
app.get('/health/performance', performanceHealth);
app.get('/health/all', allHealth);

// Public status endpoint (no auth required)
app.get('/status', async (c) => {
  return c.json({
    service: 'GoHalalLife Status Worker',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
  });
});

// Root endpoint
app.get('/', async (c) => {
  return c.json({
    message: 'GoHalalLife Status Worker',
    version: '1.0.0',
    endpoints: [
      '/status - Public status check',
      '/health/db - Database health',
      '/health/fts - Full-text search health',
      '/health/performance - Performance metrics',
      '/health/all - All health checks combined',
    ],
  });
});

export default app;