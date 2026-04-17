// SECURITY: Mock-Server darf NIEMALS in Produktion laufen.
// Hardcoded Admin-Credentials, Plaintext-Passwoerter, keine RLS — Dev-only.
if (process.env.NODE_ENV === 'production') {
  console.error(
    '[auth-server] FATAL: auth-server.js darf nicht mit NODE_ENV=production laufen. '
    + 'Produktiv-Stack nutzt self-hosted Supabase (docker-compose.yml).'
  );
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

console.warn('[auth-server] DEV-ONLY Mock-Server gestartet. NICHT fuer Produktion verwenden.');

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3080', 'http://localhost:5173'],
  credentials: true,
}));

// ─── In-memory stores ───────────────────────────────────────────────────────
const users = new Map();    // userId → { email, password, role }
const sessions = new Map(); // token  → { userId, email, role }

// Generic tables: tableName → Map(id → row)
const tables = new Map([
  ['fields', new Map()],
  ['field_crop_plans', new Map()],
  ['crops', new Map()],
  ['nutrient_types', new Map()],
  ['crop_nutrient_demands', new Map()],
  ['corrections', new Map()],
  ['correction_values', new Map()],
  ['fertilizer_products', new Map()],
  ['field_geometries', new Map()],
]);

// ─── Seed admin user ──────────────────────────────────────────────────────
const adminId = uuidv4();
users.set(adminId, { email: 'admin@test.de', password: 'admin1234', role: 'admin' });
console.log('🔑 Admin user seeded: admin@test.de / admin1234');

// ─── Auth helpers ─────────────────────────────────────────────────────────

function getCredentials(req) {
  const username = req.body?.username || req.query?.username
    || req.body?.email || req.query?.email;
  return {
    grant_type: req.body?.grant_type || req.query?.grant_type,
    username,
    password: req.body?.password || req.query?.password,
  };
}

function getUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !sessions.has(token)) return null;
  const { userId, email, role } = sessions.get(token);
  return { id: userId, email, app_metadata: { role }, user_metadata: {} };
}

// ─── Auth endpoints ───────────────────────────────────────────────────────

app.post('/auth/v1/signup', (req, res) => {
  const { email, password } = req.body;
  for (const u of users.values()) {
    if (u.email === email) return res.status(400).json({ error: { message: 'User already exists' } });
  }
  const userId = uuidv4();
  const token = uuidv4();
  users.set(userId, { email, password, role: 'user' });
  sessions.set(token, { userId, email, role: 'user' });
  console.log(`✅ Signup: ${email}`);
  res.json({
    user: { id: userId, email, app_metadata: { role: 'user' } },
    session: { access_token: token, token_type: 'bearer' },
  });
});

app.post('/auth/v1/signin', (req, res) => {
  const { email, password } = req.body;
  for (const [id, u] of users.entries()) {
    if (u.email === email && u.password === password) {
      const token = uuidv4();
      const role = u.role ?? 'user';
      sessions.set(token, { userId: id, email, role });
      console.log(`✅ Signin: ${email}`);
      return res.json({
        user: { id, email, app_metadata: { role } },
        session: { access_token: token, token_type: 'bearer' },
      });
    }
  }
  res.status(401).json({ error: { message: 'Invalid credentials' } });
});

app.post('/auth/v1/signout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) sessions.delete(token);
  res.json({});
});

app.get('/auth/v1/user', (req, res) => {
  const user = getUser(req);
  res.json({ user });
});

app.post('/auth/v1/token', (req, res) => {
  const { grant_type, username, password } = getCredentials(req);
  if (grant_type !== 'password') return res.status(400).json({ error: 'unsupported_grant_type' });
  if (!username || !password) return res.status(400).json({ error: 'invalid_request' });

  for (const [id, u] of users.entries()) {
    if (u.email === username && u.password === password) {
      const token = uuidv4();
      const role = u.role ?? 'user';
      sessions.set(token, { userId: id, email: username, role });
      console.log(`✅ Token issued: ${username}`);
      return res.json({ access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: uuidv4(), user: { id, email: username, app_metadata: { role }, user_metadata: {} } });
    }
  }
  res.status(401).json({ error: 'invalid_grant', error_description: 'Invalid credentials' });
});

// ─── Supabase REST API mock (/rest/v1/:table) ─────────────────────────────

function parseFilters(query) {
  // Parse Supabase filter syntax: field=eq.value, field=neq.value, etc.
  const filters = [];
  for (const [key, val] of Object.entries(query)) {
    if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') continue;
    if (typeof val === 'string' && val.includes('.')) {
      const [op, ...rest] = val.split('.');
      filters.push({ key, op, value: rest.join('.') });
    }
  }
  return filters;
}

function applyFilters(rows, filters) {
  return rows.filter(row => filters.every(({ key, op, value }) => {
    const cell = String(row[key] ?? '');
    if (op === 'eq') return cell === value;
    if (op === 'neq') return cell !== value;
    if (op === 'is' && value === 'null') return row[key] == null;
    return true;
  }));
}

function parseOrder(orderStr) {
  if (!orderStr) return null;
  const [col, dir] = orderStr.split('.');
  return { col, desc: dir === 'desc' };
}

app.get('/rest/v1/:table', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { table } = req.params;
  if (!tables.has(table)) return res.status(404).json({ message: `Table "${table}" not found` });

  let rows = [...tables.get(table).values()];

  // Apply filters
  const filters = parseFilters(req.query);
  rows = applyFilters(rows, filters);

  // Apply ordering
  const order = parseOrder(req.query.order);
  if (order) {
    rows.sort((a, b) => {
      const av = a[order.col] ?? '';
      const bv = b[order.col] ?? '';
      return order.desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }

  console.log(`📋 GET /rest/v1/${table} → ${rows.length} rows`);
  res.json(rows);
});

app.post('/rest/v1/:table', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { table } = req.params;
  if (!tables.has(table)) return res.status(404).json({ message: `Table "${table}" not found` });

  const store = tables.get(table);
  const now = new Date().toISOString();

  const input = Array.isArray(req.body) ? req.body : [req.body];
  const inserted = input.map(item => {
    const row = {
      id: uuidv4(),
      user_id: user.id,
      created_at: now,
      updated_at: now,
      synced: true,
      ...item,
    };
    store.set(row.id, row);
    return row;
  });

  const prefer = req.headers['prefer'] ?? '';
  const result = prefer.includes('return=representation')
    ? (inserted.length === 1 ? inserted[0] : inserted)
    : '';

  console.log(`➕ POST /rest/v1/${table} → inserted ${inserted.length}`);

  // Prefer: return=representation returns the row, else 201 no content
  if (result) {
    res.status(201).json(result);
  } else {
    res.status(201).json(inserted.length === 1 ? inserted[0] : inserted);
  }
});

app.patch('/rest/v1/:table', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { table } = req.params;
  if (!tables.has(table)) return res.status(404).json({ message: `Table "${table}" not found` });

  const store = tables.get(table);
  const filters = parseFilters(req.query);
  const now = new Date().toISOString();

  let updated = [];
  for (const [id, row] of store.entries()) {
    const matches = applyFilters([row], filters);
    if (matches.length > 0) {
      const newRow = { ...row, ...req.body, updated_at: now };
      store.set(id, newRow);
      updated.push(newRow);
    }
  }

  console.log(`✏️  PATCH /rest/v1/${table} → updated ${updated.length}`);
  res.json(updated.length === 1 ? updated[0] : updated);
});

app.delete('/rest/v1/:table', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { table } = req.params;
  if (!tables.has(table)) return res.status(404).json({ message: `Table "${table}" not found` });

  const store = tables.get(table);
  const filters = parseFilters(req.query);

  let deleted = 0;
  for (const [id, row] of store.entries()) {
    if (applyFilters([row], filters).length > 0) {
      store.delete(id);
      deleted++;
    }
  }

  console.log(`🗑️  DELETE /rest/v1/${table} → deleted ${deleted}`);
  res.json({ count: deleted });
});

// ─── Health check ─────────────────────────────────────────────────────────

// DEV ONLY — Mock auth server, NEVER use in production!
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── Start ───────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Mock Supabase running on http://localhost:${PORT}`);
  console.log(`📋 Auth:  /auth/v1/{signup,signin,signout,token,user}`);
  console.log(`🗄️  REST:  /rest/v1/{fields,crops,nutrient_types,...}`);
  console.log(`💾 Storage: in-memory (restart = data reset)\n`);
});
