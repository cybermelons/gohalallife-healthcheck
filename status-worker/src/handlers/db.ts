import { Context } from 'hono';
import { Env } from '../index';

export async function dbHealth(c: Context<{ Bindings: Env }>) {
  const start = Date.now();
  
  try {
    // Test basic connection
    const connectTest = await c.env.DB.prepare('SELECT 1 as test').first();
    
    if (!connectTest || connectTest.test !== 1) {
      throw new Error('Database connection failed');
    }

    // Test restaurant table exists and has data
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM restaurants'
    ).first();

    const recordCount = countResult?.count as number || 0;
    
    // We expect 90k-100k records based on the import
    const expectedMin = 85000;
    const expectedMax = 105000;
    const isCountHealthy = recordCount >= expectedMin && recordCount <= expectedMax;

    // Test recent data integrity
    const sampleRecord = await c.env.DB.prepare(
      'SELECT name, place_id, lat, lng, vicinity FROM restaurants LIMIT 1'
    ).first();

    const hasValidSample = sampleRecord && 
      sampleRecord.name && 
      sampleRecord.place_id && 
      sampleRecord.lat && 
      sampleRecord.lng;

    const responseTime = Date.now() - start;
    const isHealthy = isCountHealthy && hasValidSample && responseTime < 1000;

    return c.json({
      status: isHealthy ? 'healthy' : 'degraded',
      checks: {
        connection: {
          status: 'healthy',
          responseTime: `${responseTime}ms`,
        },
        recordCount: {
          status: isCountHealthy ? 'healthy' : 'warning',
          count: recordCount,
          expected: `${expectedMin}-${expectedMax}`,
        },
        dataIntegrity: {
          status: hasValidSample ? 'healthy' : 'error',
          sample: hasValidSample ? 'valid' : 'invalid',
        },
      },
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
    });

  } catch (error) {
    const responseTime = Date.now() - start;
    
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
    }, 500);
  }
}