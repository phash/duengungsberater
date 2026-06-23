'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const https = require('https');
const { URL, URLSearchParams } = require('url');

const PORT = process.env.PORT || 3100;

function getConfig() {
  return {
    clientId: process.env.IBALIS_CLIENT_ID || '',
    clientSecret: process.env.IBALIS_CLIENT_SECRET || '',
    redirectUri:
      process.env.IBALIS_REDIRECT_URI ||
      'https://duenger.mr-development.de/ibalis/callback',
    siteUrl: process.env.SITE_URL || 'https://duenger.mr-development.de',
    isMock: process.env.IBALIS_MOCK === 'true',
    authUrl: 'https://zad.stmelf.bybn.de/zad/oauth/authorize',
    tokenUrl: 'https://zad.stmelf.bybn.de/zad/oauth/token',
    feldstueckeBase:
      'https://flaecheiws.stmelf.bybn.de/flaecheiws/ws/rest/agrardatennetzwerk/flaechenverwaltung/v1/feldstuecke',
  };
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 min für OAuth-Flow
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 h für eingelöste Session
const STATE_STORE_CAP = 10_000;
const SESSION_STORE_CAP = 10_000;
const SESSION_COOKIE = 'ibalis_session';

// issuedStates: state -> expiresAt (reine „gültig ausgestellt" Markierung)
const issuedStates = new Map();
// sessions: sessionId -> { access_token, refresh_token, expires_at }
const sessions = new Map();

function pruneExpired(store, nowKey = 'expires_at') {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    const exp = typeof value === 'number' ? value : value[nowKey];
    if (exp < now) store.delete(key);
  }
}

function capStore(store, cap) {
  while (store.size > cap) {
    const firstKey = store.keys().next().value;
    store.delete(firstKey);
  }
}

let pruneInterval = null;
function startPruning() {
  if (pruneInterval) return;
  pruneInterval = setInterval(() => {
    pruneExpired(issuedStates);
    pruneExpired(sessions);
  }, 60 * 1000);
}
function stopPruning() {
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
}

function issueState() {
  const state = crypto.randomBytes(16).toString('hex');
  issuedStates.set(state, Date.now() + STATE_TTL_MS);
  capStore(issuedStates, STATE_STORE_CAP);
  return state;
}

function consumeState(state) {
  const exp = issuedStates.get(state);
  if (!exp) return false;
  issuedStates.delete(state);
  return exp >= Date.now();
}

function newSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function storeSession(entry) {
  const sessionId = newSessionId();
  sessions.set(sessionId, entry);
  capStore(sessions, SESSION_STORE_CAP);
  return sessionId;
}

// Test-Helper: State ausstellen ohne HTTP-Roundtrip
function __issueState() {
  return issueState();
}

// Test-Helper: Stores zwischen Tests leeren
function __resetStores() {
  issuedStates.clear();
  sessions.clear();
}

function httpsPost(urlString, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGetWithBearer(urlString, accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    // Defense-in-depth: Bearer-Token niemals über unverschlüsselte Verbindung senden.
    if (url.protocol !== 'https:') {
      reject(new Error(`[ibalis-proxy] Refusing to send bearer token over non-HTTPS URL (${url.protocol})`));
      return;
    }
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          reject(new Error(`Failed to parse API response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function exchangeCodeForToken(code, cfg) {
  const result = await httpsPost(cfg.tokenUrl, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  if (result.status !== 200) {
    throw new Error(
      `Token exchange failed with status ${result.status}: ${JSON.stringify(result.body)}`,
    );
  }
  const { access_token, refresh_token, expires_in } = result.body;
  return {
    access_token,
    refresh_token,
    expires_at: Date.now() + (expires_in || 3600) * 1000,
  };
}

async function refreshAccessToken(entry, cfg) {
  if (!entry.refresh_token) throw new Error('No refresh_token available');
  const result = await httpsPost(cfg.tokenUrl, {
    grant_type: 'refresh_token',
    refresh_token: entry.refresh_token,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  if (result.status !== 200) {
    throw new Error(
      `Token refresh failed with status ${result.status}: ${JSON.stringify(result.body)}`,
    );
  }
  const { access_token, refresh_token, expires_in } = result.body;
  return {
    access_token,
    refresh_token: refresh_token || entry.refresh_token,
    expires_at: Date.now() + (expires_in || 3600) * 1000,
  };
}

const MOCK_FELDSTUECKE = {
  feldstuecke: [
    {
      fsNummer: 1, fsName: 'Oberer Acker', flik: 'DEBYLI9832000032',
      flaechenanteilInProzent: 100, flaecheInHektar: 8.75,
      geometryWKT: 'POLYGON ((11.5 48.1, 11.505 48.1, 11.505 48.104, 11.5 48.104, 11.5 48.1))',
      nutzungen: [{ schlagNr: '1', nutzungscode: { code: '115', bezeichnung: 'Winterweizen' }, flaecheInHektar: 8.75 }],
      landschaftselemente: [],
    },
    {
      fsNummer: 2, fsName: 'Talfeld Süd', flik: 'DEBYLI9832000045',
      flaechenanteilInProzent: 100, flaecheInHektar: 12.5,
      geometryWKT: 'POLYGON ((11.51 48.09, 11.518 48.09, 11.518 48.095, 11.51 48.095, 11.51 48.09))',
      nutzungen: [{ schlagNr: '1', nutzungscode: { code: '411', bezeichnung: 'Silomais' }, flaecheInHektar: 12.5 }],
      landschaftselemente: [],
    },
    {
      fsNummer: 3, fsName: 'Waldrandstück', flik: 'DEBYLI9832000058',
      flaechenanteilInProzent: 100, flaecheInHektar: 5.25,
      geometryWKT: 'POLYGON ((11.52 48.105, 11.525 48.105, 11.525 48.108, 11.52 48.108, 11.52 48.105))',
      nutzungen: [{ schlagNr: '1', nutzungscode: { code: '131', bezeichnung: 'Wintergerste' }, flaecheInHektar: 5.25 }],
      landschaftselemente: [],
    },
  ],
};

function createApp(opts = {}) {
  const cfg = getConfig();
  const app = express();
  app.use(cookieParser());
  app.use(express.json({ limit: '16kb' }));

  // Rate-Limit: standardmäßig 30/min/IP, in Tests deaktivierbar
  const rateLimitDisabled = opts.disableRateLimit === true;
  const oauthLimiter = rateLimitDisabled
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
      });

  app.get('/ibalis/health', (_req, res) => {
    res.json({ status: 'ok', mock: cfg.isMock });
  });

  app.get('/ibalis/auth', oauthLimiter, (req, res) => {
    const state = issueState();
    if (cfg.isMock) {
      const callbackUrl = new URL(cfg.redirectUri);
      callbackUrl.searchParams.set('code', 'mock-code-' + state);
      callbackUrl.searchParams.set('state', state);
      return res.redirect(callbackUrl.toString());
    }
    if (!cfg.clientId) {
      return res.status(500).json({ error: 'IBALIS_CLIENT_ID not configured' });
    }
    const authUrl = new URL(cfg.authUrl);
    authUrl.searchParams.set('client_id', cfg.clientId);
    authUrl.searchParams.set('redirect_uri', cfg.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('state', state);
    res.redirect(authUrl.toString());
  });

  app.get('/ibalis/callback', oauthLimiter, async (req, res) => {
    const { code, state, error } = req.query;

    const redirectError = (reason) => {
      const u = new URL(`${cfg.siteUrl}/felder`);
      u.searchParams.set('ibalis', 'error');
      u.searchParams.set('reason', reason);
      return res.redirect(u.toString());
    };

    if (error) return redirectError(String(error));
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // State-Validation: einmalig einlösbar, muss unabgelaufen sein
    if (!consumeState(String(state))) {
      return redirectError('invalid_state');
    }

    try {
      let entry;
      if (cfg.isMock) {
        entry = {
          access_token: 'mock-access-token-' + state,
          refresh_token: 'mock-refresh-token-' + state,
          expires_at: Date.now() + SESSION_TTL_MS,
        };
      } else {
        entry = await exchangeCodeForToken(String(code), cfg);
      }

      const sessionId = storeSession(entry);
      res.cookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: cfg.siteUrl.startsWith('https://'),
        maxAge: SESSION_TTL_MS,
        path: '/ibalis',
      });

      const appUrl = new URL(`${cfg.siteUrl}/felder`);
      appUrl.searchParams.set('ibalis', 'connected');
      res.redirect(appUrl.toString());
    } catch (err) {
      console.error('[ibalis-proxy] Token exchange error:', err.message);
      redirectError('token_exchange_failed');
    }
  });

  app.get('/ibalis/feldstuecke/:betriebsnummer/:jahr', async (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) {
      return res.status(401).json({ error: 'No session cookie' });
    }
    let entry = sessions.get(sessionId);
    if (!entry || entry.expires_at < Date.now()) {
      sessions.delete(sessionId);
      return res.status(401).json({ error: 'Session expired' });
    }

    if (cfg.isMock) return res.json(MOCK_FELDSTUECKE);

    const { betriebsnummer, jahr } = req.params;
    const apiUrl = `${cfg.feldstueckeBase}/${encodeURIComponent(betriebsnummer)}/${encodeURIComponent(jahr)}`;

    try {
      let result = await httpsGetWithBearer(apiUrl, entry.access_token);
      if (result.status === 401) {
        try {
          entry = await refreshAccessToken(entry, cfg);
          sessions.set(sessionId, entry);
          result = await httpsGetWithBearer(apiUrl, entry.access_token);
        } catch (refreshErr) {
          console.error('[ibalis-proxy] Token refresh failed:', refreshErr.message);
          sessions.delete(sessionId);
          return res.status(401).json({ error: 'Token expired and refresh failed' });
        }
      }
      if (result.status !== 200) {
        return res.status(result.status).json(result.body);
      }
      res.json(result.body);
    } catch (err) {
      console.error('[ibalis-proxy] Feldstuecke fetch error:', err.message);
      res.status(502).json({ error: 'Upstream request failed', detail: err.message });
    }
  });

  return app;
}

if (require.main === module) {
  startPruning();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[ibalis-proxy] Listening on port ${PORT} (mock=${getConfig().isMock})`);
  });
}

module.exports = {
  createApp,
  __issueState,
  __resetStores,
  startPruning,
  stopPruning,
  SESSION_COOKIE,
};
