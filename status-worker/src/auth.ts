import { Context } from 'hono';
import { Env } from './index';

export async function authenticate(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  // Check for API key in header
  const apiKey = c.req.header('X-API-Key');
  const expectedKey = c.env.API_KEY;

  // If API key is set, require it
  if (expectedKey && (!apiKey || apiKey !== expectedKey)) {
    // Optional: Check IP allowlist for GitHub Actions
    const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For');
    const allowedIPs = c.env.ALLOWED_IPS?.split(',') || [];
    
    if (allowedIPs.length > 0 && clientIP) {
      const isAllowedIP = allowedIPs.some(allowedIP => {
        if (allowedIP.includes('/')) {
          // CIDR range - simplified check (would need proper CIDR library for production)
          const [subnet, mask] = allowedIP.split('/');
          return clientIP.startsWith(subnet.split('.').slice(0, parseInt(mask) / 8).join('.'));
        }
        return clientIP === allowedIP;
      });

      if (!isAllowedIP) {
        return c.json({ error: 'Authentication required' }, 401);
      }
    } else if (!expectedKey) {
      // No API key set and no IP restrictions - allow access
      return await next();
    } else {
      return c.json({ error: 'Authentication required' }, 401);
    }
  }

  await next();
}