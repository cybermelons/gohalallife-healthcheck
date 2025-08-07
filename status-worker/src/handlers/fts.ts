import { Context } from 'hono';
import { Env } from '../index';

export async function ftsHealth(c: Context<{ Bindings: Env }>) {
  const start = Date.now();
  const testQueries = [
    { term: 'halal', expectedMin: 1000 },
    { term: 'pizza', expectedMin: 100 },
    { term: 'chicago', expectedMin: 500 },
    { term: 'restaurant', expectedMin: 5000 },
  ];

  const results = [];

  try {
    // Test that FTS table exists
    const ftsCheck = await c.env.DB.prepare(
      'SELECT name FROM sqlite_master WHERE type="table" AND name="restaurants_fts"'
    ).first();

    if (!ftsCheck) {
      throw new Error('FTS table restaurants_fts does not exist');
    }

    // Test each query
    for (const { term, expectedMin } of testQueries) {
      const queryStart = Date.now();
      
      try {
        // Use correct FTS syntax with subquery approach
        const searchResult = await c.env.DB.prepare(`
          SELECT COUNT(*) as count 
          FROM restaurants r 
          WHERE r.rowid IN (
            SELECT rowid FROM restaurants_fts 
            WHERE restaurants_fts MATCH ?
          )
        `).bind(term).first();

        const count = searchResult?.count as number || 0;
        const queryTime = Date.now() - queryStart;
        const isHealthy = count >= expectedMin && queryTime < 500;

        results.push({
          term,
          status: isHealthy ? 'healthy' : count < expectedMin ? 'warning' : 'degraded',
          count,
          expected: `>=${expectedMin}`,
          responseTime: `${queryTime}ms`,
        });
      } catch (queryError) {
        results.push({
          term,
          status: 'error',
          error: queryError instanceof Error ? queryError.message : 'Query failed',
          responseTime: `${Date.now() - queryStart}ms`,
        });
      }
    }

    // Test a more complex FTS query
    const complexStart = Date.now();
    const complexResult = await c.env.DB.prepare(`
      SELECT r.name, r.vicinity, r.rating 
      FROM restaurants r 
      WHERE r.rowid IN (
        SELECT rowid FROM restaurants_fts 
        WHERE restaurants_fts MATCH ?
      )
      AND r.rating >= 4.0
      LIMIT 5
    `).bind('halal pizza').all();

    const complexTime = Date.now() - complexStart;
    
    const overallTime = Date.now() - start;
    const allHealthy = results.every(r => r.status === 'healthy');
    const hasResults = complexResult.results && complexResult.results.length > 0;

    return c.json({
      status: allHealthy && hasResults ? 'healthy' : 'degraded',
      checks: {
        ftsTable: {
          status: 'healthy',
          exists: true,
        },
        searchQueries: results,
        complexQuery: {
          status: hasResults ? 'healthy' : 'warning',
          query: 'halal pizza + rating filter',
          resultCount: complexResult.results?.length || 0,
          responseTime: `${complexTime}ms`,
        },
      },
      timestamp: new Date().toISOString(),
      responseTime: `${overallTime}ms`,
    });

  } catch (error) {
    const responseTime = Date.now() - start;
    
    return c.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'FTS health check failed',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
    }, 500);
  }
}