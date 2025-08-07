import { Context } from 'hono';
import { Env } from '../index';

export async function allHealth(c: Context<{ Bindings: Env }>) {
  const start = Date.now();
  
  try {
    // Import individual health check functions
    const { dbHealth } = await import('./db');
    const { ftsHealth } = await import('./fts');
    const { performanceHealth } = await import('./performance');

    // Run all health checks in parallel
    const [dbResult, ftsResult, perfResult] = await Promise.allSettled([
      // Create mock contexts for individual health checks
      dbHealth(c),
      ftsHealth(c),
      performanceHealth(c),
    ]);

    // Parse results
    const dbStatus = dbResult.status === 'fulfilled' ? await dbResult.value.json() : null;
    const ftsStatus = ftsResult.status === 'fulfilled' ? await ftsResult.value.json() : null;
    const perfStatus = perfResult.status === 'fulfilled' ? await perfResult.value.json() : null;

    // Determine overall system status
    const statuses = [
      dbStatus?.status || 'error',
      ftsStatus?.status || 'error', 
      perfStatus?.status || 'error'
    ];

    let overallStatus = 'healthy';
    if (statuses.includes('error')) {
      overallStatus = 'error';
    } else if (statuses.includes('degraded') || statuses.includes('warning')) {
      overallStatus = 'degraded';
    }

    const totalTime = Date.now() - start;

    // Build comprehensive response
    const response = {
      status: overallStatus,
      summary: {
        database: dbStatus?.status || 'error',
        fullTextSearch: ftsStatus?.status || 'error',
        performance: perfStatus?.status || 'error',
        overallHealth: overallStatus,
        totalResponseTime: `${totalTime}ms`,
      },
      details: {
        database: {
          status: dbStatus?.status || 'error',
          recordCount: dbStatus?.checks?.recordCount?.count || 0,
          connection: dbStatus?.checks?.connection?.status || 'error',
          responseTime: dbStatus?.responseTime || 'unknown',
        },
        fullTextSearch: {
          status: ftsStatus?.status || 'error',
          searchTests: ftsStatus?.checks?.searchQueries?.length || 0,
          complexQuery: ftsStatus?.checks?.complexQuery?.status || 'error',
          responseTime: ftsStatus?.responseTime || 'unknown',
        },
        performance: {
          status: perfStatus?.status || 'error',
          totalTests: perfStatus?.summary?.totalTests || 0,
          healthyTests: perfStatus?.summary?.healthyTests || 0,
          averageResponseTime: perfStatus?.summary?.averageResponseTime || 'unknown',
        },
      },
      rawResults: {
        database: dbStatus,
        fullTextSearch: ftsStatus,
        performance: perfStatus,
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    // Set appropriate HTTP status
    const httpStatus = overallStatus === 'error' ? 503 : 
                     overallStatus === 'degraded' ? 206 : 200;

    return c.json(response, httpStatus);

  } catch (error) {
    const responseTime = Date.now() - start;
    
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'System health check failed',
      summary: {
        database: 'unknown',
        fullTextSearch: 'unknown', 
        performance: 'unknown',
        overallHealth: 'error',
        totalResponseTime: `${responseTime}ms`,
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }, 500);
  }
}