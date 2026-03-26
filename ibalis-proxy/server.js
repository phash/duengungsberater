'use strict';

const express = require('express');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL, URLSearchParams } = require('url');

const app = express();
const PORT = process.env.PORT || 3100;

const IBALIS_CLIENT_ID = process.env.IBALIS_CLIENT_ID || '';
const IBALIS_CLIENT_SECRET = process.env.IBALIS_CLIENT_SECRET || '';
const IBALIS_REDIRECT_URI =
  process.env.IBALIS_REDIRECT_URI ||
  'https://duenger.mr-development.de/ibalis/callback';
const SITE_URL = process.env.SITE_URL || 'https://duenger.mr-development.de';
const IS_MOCK = process.env.IBALIS_MOCK === 'true';

const IBALIS_AUTH_URL = 'https://zad.stmelf.bybn.de/zad/oauth/authorize';
const IBALIS_TOKEN_URL = 'https://zad.stmelf.bybn.de/zad/oauth/token';
const IBALIS_FELDSTUECKE_BASE =
  'https://flaecheiws.stmelf.bybn.de/flaecheiws/ws/rest/agrardatennetzwerk/flaechenverwaltung/v1/feldstuecke';

// ---------------------------------------------------------------------------
// In-memory token store: state -> { access_token, refresh_token, expires_at }
// Tokens older than 1h are pruned periodically.
// ---------------------------------------------------------------------------
const tokenStore = new Map();

function pruneExpiredTokens() {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expires_at < now) {
      tokenStore.delete(key);
    }
  }
}

setInterval(pruneExpiredTokens, 60 * 1000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Performs an HTTPS POST with an x-www-form-urlencoded body.
 * Returns a Promise that resolves to the parsed JSON response body.
 */
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Performs an HTTPS GET request with a Bearer token.
 * Returns a Promise that resolves to { status, body (parsed JSON) }.
 */
function httpsGetWithBearer(urlString, accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    };

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          reject(new Error(`Failed to parse API response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Exchanges an authorization code for tokens and stores them under the given
 * state key. Returns the stored token entry.
 */
async function exchangeCodeForToken(code, state) {
  const result = await httpsPost(IBALIS_TOKEN_URL, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: IBALIS_REDIRECT_URI,
    client_id: IBALIS_CLIENT_ID,
    client_secret: IBALIS_CLIENT_SECRET,
  });

  if (result.status !== 200) {
    throw new Error(
      `Token exchange failed with status ${result.status}: ${JSON.stringify(result.body)}`
    );
  }

  const { access_token, refresh_token, expires_in } = result.body;
  const entry = {
    access_token,
    refresh_token,
    // Default to 1 hour if expires_in is missing
    expires_at: Date.now() + (expires_in || 3600) * 1000,
  };
  tokenStore.set(state, entry);
  return entry;
}

/**
 * Attempts a token refresh using the stored refresh_token.
 * Updates the token store on success.
 */
async function refreshAccessToken(state, entry) {
  if (!entry.refresh_token) {
    throw new Error('No refresh_token available');
  }

  const result = await httpsPost(IBALIS_TOKEN_URL, {
    grant_type: 'refresh_token',
    refresh_token: entry.refresh_token,
    client_id: IBALIS_CLIENT_ID,
    client_secret: IBALIS_CLIENT_SECRET,
  });

  if (result.status !== 200) {
    throw new Error(
      `Token refresh failed with status ${result.status}: ${JSON.stringify(result.body)}`
    );
  }

  const { access_token, refresh_token, expires_in } = result.body;
  const updated = {
    access_token,
    refresh_token: refresh_token || entry.refresh_token,
    expires_at: Date.now() + (expires_in || 3600) * 1000,
  };
  tokenStore.set(state, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_FELDSTUECKE = {
  feldstuecke: [
    {
      fsNummer: 1,
      fsName: 'Oberer Acker',
      flik: 'DEBYLI9832000032',
      flaechenanteilInProzent: 100,
      flaecheInHektar: 8.75,
      geometryWKT:
        'POLYGON ((11.5 48.1, 11.505 48.1, 11.505 48.104, 11.5 48.104, 11.5 48.1))',
      nutzungen: [
        {
          schlagNr: '1',
          nutzungscode: { code: '115', bezeichnung: 'Winterweizen' },
          flaecheInHektar: 8.75,
        },
      ],
      landschaftselemente: [],
    },
    {
      fsNummer: 2,
      fsName: 'Talfeld Süd',
      flik: 'DEBYLI9832000045',
      flaechenanteilInProzent: 100,
      flaecheInHektar: 12.5,
      geometryWKT:
        'POLYGON ((11.51 48.09, 11.518 48.09, 11.518 48.095, 11.51 48.095, 11.51 48.09))',
      nutzungen: [
        {
          schlagNr: '1',
          nutzungscode: { code: '411', bezeichnung: 'Silomais' },
          flaecheInHektar: 12.5,
        },
      ],
      landschaftselemente: [],
    },
    {
      fsNummer: 3,
      fsName: 'Waldrandstück',
      flik: 'DEBYLI9832000058',
      flaechenanteilInProzent: 100,
      flaecheInHektar: 5.25,
      geometryWKT:
        'POLYGON ((11.52 48.105, 11.525 48.105, 11.525 48.108, 11.52 48.108, 11.52 48.105))',
      nutzungen: [
        {
          schlagNr: '1',
          nutzungscode: { code: '131', bezeichnung: 'Wintergerste' },
          flaecheInHektar: 5.25,
        },
      ],
      landschaftselemente: [],
    },
  ],
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /ibalis/health
 * Simple health check.
 */
app.get('/ibalis/health', (req, res) => {
  res.json({ status: 'ok', mock: IS_MOCK });
});

/**
 * GET /ibalis/auth
 * Initiates the OAuth2 Authorization Code Flow.
 * In mock mode: redirects directly to the callback with a fake code.
 */
app.get('/ibalis/auth', (req, res) => {
  const state = generateState();

  if (IS_MOCK) {
    // Skip the real authorization server in mock mode
    const callbackUrl = new URL(`${IBALIS_REDIRECT_URI}`);
    callbackUrl.searchParams.set('code', 'mock-code-' + state);
    callbackUrl.searchParams.set('state', state);
    return res.redirect(callbackUrl.toString());
  }

  if (!IBALIS_CLIENT_ID) {
    return res.status(500).json({ error: 'IBALIS_CLIENT_ID not configured' });
  }

  const authUrl = new URL(IBALIS_AUTH_URL);
  authUrl.searchParams.set('client_id', IBALIS_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', IBALIS_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid');
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
});

/**
 * GET /ibalis/callback
 * Handles the OAuth2 redirect from iBalis.
 * Exchanges the code for tokens, then redirects back to the app.
 */
app.get('/ibalis/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    const errorUrl = new URL(`${SITE_URL}/felder`);
    errorUrl.searchParams.set('ibalis', 'error');
    errorUrl.searchParams.set('reason', String(error));
    return res.redirect(errorUrl.toString());
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  try {
    if (IS_MOCK) {
      // Store a fake token entry for the session
      tokenStore.set(state, {
        access_token: 'mock-access-token-' + state,
        refresh_token: 'mock-refresh-token-' + state,
        expires_at: Date.now() + 3600 * 1000,
      });
    } else {
      await exchangeCodeForToken(String(code), String(state));
    }

    const appUrl = new URL(`${SITE_URL}/felder`);
    appUrl.searchParams.set('ibalis', 'connected');
    appUrl.searchParams.set('session', String(state));
    res.redirect(appUrl.toString());
  } catch (err) {
    console.error('[ibalis-proxy] Token exchange error:', err.message);
    const errorUrl = new URL(`${SITE_URL}/felder`);
    errorUrl.searchParams.set('ibalis', 'error');
    errorUrl.searchParams.set('reason', 'token_exchange_failed');
    res.redirect(errorUrl.toString());
  }
});

/**
 * GET /ibalis/feldstuecke/:betriebsnummer/:jahr
 * Proxies the iBalis Feldstücke API.
 * Requires ?session=STATE query parameter to look up the access token.
 */
app.get('/ibalis/feldstuecke/:betriebsnummer/:jahr', async (req, res) => {
  const { betriebsnummer, jahr } = req.params;
  const { session } = req.query;

  if (!session) {
    return res.status(400).json({ error: 'Missing session parameter' });
  }

  const sessionKey = String(session);

  if (IS_MOCK) {
    return res.json(MOCK_FELDSTUECKE);
  }

  let entry = tokenStore.get(sessionKey);
  if (!entry) {
    return res.status(401).json({ error: 'Session not found or expired' });
  }

  const apiUrl = `${IBALIS_FELDSTUECKE_BASE}/${encodeURIComponent(betriebsnummer)}/${encodeURIComponent(jahr)}`;

  try {
    let result = await httpsGetWithBearer(apiUrl, entry.access_token);

    // On 401 attempt one token refresh
    if (result.status === 401) {
      try {
        entry = await refreshAccessToken(sessionKey, entry);
        result = await httpsGetWithBearer(apiUrl, entry.access_token);
      } catch (refreshErr) {
        console.error('[ibalis-proxy] Token refresh failed:', refreshErr.message);
        tokenStore.delete(sessionKey);
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

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[ibalis-proxy] Listening on port ${PORT} (mock=${IS_MOCK})`);
});
