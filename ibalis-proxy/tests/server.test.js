import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp, __issueState, __resetStores, SESSION_COOKIE } from '../server.js';

describe('iBalis-Proxy Security', () => {
  let app;

  beforeEach(() => {
    process.env.IBALIS_MOCK = 'true';
    process.env.SITE_URL = 'http://localhost:3080';
    __resetStores();
    app = createApp({ disableRateLimit: true });
  });

  it('rejects /ibalis/callback with unknown state', async () => {
    const res = await request(app)
      .get('/ibalis/callback?code=x&state=unknown-state-value');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('ibalis=error');
    expect(res.headers.location).toContain('reason=invalid_state');
  });

  it('accepts callback with valid state and sets HttpOnly session cookie', async () => {
    const state = __issueState();
    const res = await request(app)
      .get(`/ibalis/callback?code=mock-code&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('ibalis=connected');
    expect(res.headers.location).not.toContain('session=');
    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toMatch(new RegExp(`${SESSION_COOKIE}=`));
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
  });

  it('state can only be used once (one-time)', async () => {
    const state = __issueState();
    await request(app).get(`/ibalis/callback?code=x&state=${state}`);
    const res2 = await request(app).get(`/ibalis/callback?code=x&state=${state}`);
    expect(res2.headers.location).toContain('reason=invalid_state');
  });

  it('/ibalis/feldstuecke reads session from cookie', async () => {
    const state = __issueState();
    // Callback liefert Set-Cookie zurück, den wir manuell mitschicken
    const cb = await request(app).get(`/ibalis/callback?code=x&state=${state}`);
    const setCookie = cb.headers['set-cookie']?.[0] ?? '';
    const sessionValue = setCookie.match(/ibalis_session=([^;]+)/)?.[1];
    expect(sessionValue).toBeDefined();

    const res = await request(app)
      .get('/ibalis/feldstuecke/276-09-12345/2026')
      .set('Cookie', `${SESSION_COOKIE}=${sessionValue}`);
    expect(res.status).toBe(200);
    expect(res.body.feldstuecke).toBeDefined();
    expect(res.body.feldstuecke.length).toBeGreaterThan(0);
  });

  it('/ibalis/feldstuecke returns 401 without cookie', async () => {
    const res = await request(app)
      .get('/ibalis/feldstuecke/276-09-12345/2026');
    expect(res.status).toBe(401);
  });

  it('/ibalis/feldstuecke returns 401 with invalid cookie', async () => {
    const res = await request(app)
      .get('/ibalis/feldstuecke/276-09-12345/2026')
      .set('Cookie', `${SESSION_COOKIE}=bogus-session-id`);
    expect(res.status).toBe(401);
  });
});

describe('iBalis-Proxy Rate-Limit', () => {
  beforeEach(() => {
    process.env.IBALIS_MOCK = 'true';
    __resetStores();
  });

  it('rate-limits /ibalis/auth (30/min/IP)', async () => {
    // Mit aktivem Rate-Limit
    const app = createApp();
    let last;
    for (let i = 0; i < 35; i++) {
      last = await request(app).get('/ibalis/auth').set('X-Forwarded-For', '9.9.9.9');
    }
    expect(last.status).toBe(429);
  }, 15000);
});
