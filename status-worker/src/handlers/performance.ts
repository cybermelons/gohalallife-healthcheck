import { Context } from 'hono';
import { Env } from '../index';

export async function performanceHealth(c: Context<{ Bindings: Env }>) {
  const start = Date.now();
  const performanceTests = [];

  try {
    // Test 1: Simple SELECT query
    const simpleStart = Date.now();
    await c.env.DB.prepare('SELECT COUNT(*) FROM restaurants').first();
    const simpleTime = Date.now() - simpleStart;
    
    performanceTests.push({
      test: 'simple_count',
      query: 'SELECT COUNT(*) FROM restaurants',
      responseTime: simpleTime,
      threshold: 50,
      status: simpleTime <= 50 ? 'healthy' : simpleTime <= 100 ? 'warning' : 'error',
    });

    // Test 2: Basic restaurant lookup by place_id
    const lookupStart = Date.now();
    await c.env.DB.prepare(
      'SELECT * FROM restaurants WHERE place_id = ? LIMIT 1'
    ).bind('ChIJN1t_tDeuEmsRUsoyG83frY4').first();
    const lookupTime = Date.now() - lookupStart;
    
    performanceTests.push({
      test: 'place_id_lookup',
      query: 'SELECT by place_id',
      responseTime: lookupTime,
      threshold: 30,
      status: lookupTime <= 30 ? 'healthy' : lookupTime <= 60 ? 'warning' : 'error',
    });

    // Test 3: Geographic bounds query (common for map searches)
    const boundsStart = Date.now();
    await c.env.DB.prepare(`
      SELECT name, lat, lng, rating 
      FROM restaurants 
      WHERE lat BETWEEN ? AND ? 
        AND lng BETWEEN ? AND ? 
        AND rating >= 4.0 
      ORDER BY rating DESC 
      LIMIT 20
    `).bind(41.8, 42.0, -87.8, -87.6).all(); // Chicago bounds
    const boundsTime = Date.now() - boundsStart;
    
    performanceTests.push({
      test: 'geographic_bounds',
      query: 'Geographic search with rating filter',
      responseTime: boundsTime,
      threshold: 100,
      status: boundsTime <= 100 ? 'healthy' : boundsTime <= 200 ? 'warning' : 'error',
    });

    // Test 4: FTS search performance
    const ftsStart = Date.now();
    await c.env.DB.prepare(`
      SELECT r.name, r.vicinity, r.rating 
      FROM restaurants r 
      WHERE r.rowid IN (
        SELECT rowid FROM restaurants_fts 
        WHERE restaurants_fts MATCH ?
      )
      ORDER BY r.rating DESC 
      LIMIT 10
    `).bind('halal').all();
    const ftsTime = Date.now() - ftsStart;
    
    performanceTests.push({
      test: 'fts_search',
      query: 'Full-text search with sorting',
      responseTime: ftsTime,
      threshold: 150,
      status: ftsTime <= 150 ? 'healthy' : ftsTime <= 300 ? 'warning' : 'error',
    });

    // Test 5: Complex aggregation query
    const aggStart = Date.now();
    await c.env.DB.prepare(`
      SELECT 
        ROUND(rating) as rating_group,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM restaurants 
      WHERE rating > 0 
      GROUP BY ROUND(rating) 
      ORDER BY rating_group DESC
    `).all();
    const aggTime = Date.now() - aggStart;
    
    performanceTests.push({
      test: 'aggregation',
      query: 'Rating aggregation statistics',
      responseTime: aggTime,
      threshold: 200,
      status: aggTime <= 200 ? 'healthy' : aggTime <= 400 ? 'warning' : 'error',
    });

    // Calculate overall metrics
    const totalTime = Date.now() - start;
    const avgResponseTime = performanceTests.reduce((sum, test) => sum + test.responseTime, 0) / performanceTests.length;
    const allHealthy = performanceTests.every(test => test.status === 'healthy');
    const hasErrors = performanceTests.some(test => test.status === 'error');

    let overallStatus = 'healthy';
    if (hasErrors) overallStatus = 'error';
    else if (!allHealthy) overallStatus = 'warning';

    return c.json({
      status: overallStatus,
      summary: {
        totalTests: performanceTests.length,
        averageResponseTime: `${Math.round(avgResponseTime)}ms`,
        totalTestTime: `${totalTime}ms`,
        healthyTests: performanceTests.filter(t => t.status === 'healthy').length,
        warningTests: performanceTests.filter(t => t.status === 'warning').length,
        errorTests: performanceTests.filter(t => t.status === 'error').length,
      },
      tests: performanceTests.map(test => ({
        ...test,
        responseTime: `${test.responseTime}ms`,
        threshold: `${test.threshold}ms`,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const responseTime = Date.now() - start;
    
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Performance test failed',
      completedTests: performanceTests.length,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
    }, 500);
  }
}