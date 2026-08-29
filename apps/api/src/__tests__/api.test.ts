import { describe, it, expect } from 'vitest';

const API = 'http://localhost:3001';

describe('Health', () => {
  it('GET /api/v1/health returns ok', async () => {
    const res = await fetch(`${API}/api/v1/health`);
    const data = await res.json() as { status: string };
    expect(data.status).toBe('ok');
  });
});

describe('Search', () => {
  it('GET /api/v1/search returns results array', async () => {
    const res = await fetch(`${API}/api/v1/search?q=test`);
    const data = await res.json() as { results: unknown[] };
    expect(Array.isArray(data.results)).toBe(true);
  });
});

describe('Checkout', () => {
  it('POST /api/v1/checkout validates body', async () => {
    const res = await fetch(`${API}/api/v1/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
