import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cors());

// In-memory store
const users = new Map();
const sessions = new Map();

// Helper to get token/credentials from body or query
function getCredentials(req) {
  // Supabase.js sends 'email', but OAuth2 standard uses 'username'
  const username = req.body?.username || req.query?.username || req.body?.email || req.query?.email;

  return {
    grant_type: req.body?.grant_type || req.query?.grant_type,
    username,
    password: req.body?.password || req.query?.password,
    email: req.body?.email || req.query?.email,
  };
}

// Signup endpoint
app.post('/auth/v1/signup', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`📝 Signup: ${email}`);

    // Check if user exists
    for (const user of users.values()) {
      if (user.email === email) {
        return res.status(400).json({ error: { message: 'User already exists' } });
      }
    }

    const userId = uuidv4();
    const sessionToken = uuidv4();

    users.set(userId, { email, password });
    sessions.set(sessionToken, { userId, email });

    console.log(`✅ User created: ${email} (${userId})`);

    res.json({
      user: { id: userId, email, app_metadata: { role: 'user' } },
      session: { access_token: sessionToken, token_type: 'bearer' },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
});

// Signin endpoint
app.post('/auth/v1/signin', (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Signin: ${email}`);

    let userId = null;
    for (const [id, user] of users.entries()) {
      if (user.email === email && user.password === password) {
        userId = id;
        break;
      }
    }

    if (!userId) {
      console.log(`❌ Invalid credentials for ${email}`);
      return res.status(401).json({ error: { message: 'Invalid email or password' } });
    }

    const sessionToken = uuidv4();
    sessions.set(sessionToken, { userId, email });

    console.log(`✅ Signin successful: ${email}`);

    res.json({
      user: { id: userId, email, app_metadata: { role: 'user' } },
      session: { access_token: sessionToken, token_type: 'bearer' },
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
});

// Signout endpoint
app.post('/auth/v1/signout', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      sessions.delete(token);
      console.log(`👋 Signout: removed token`);
    }
    res.json({});
  } catch (err) {
    console.error('Signout error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
});

// Get user endpoint
app.get('/auth/v1/user', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log(`👤 Get user - token: ${token ? token.substring(0, 8) + '...' : 'NONE'}`);

    if (!token || !sessions.has(token)) {
      console.log(`❌ Invalid or missing token`);
      return res.json({ user: null });
    }

    const session = sessions.get(token);
    const user = users.get(session.userId);

    console.log(`✅ User found: ${user.email}`);

    res.json({
      user: {
        id: session.userId,
        email: user.email,
        app_metadata: { role: 'user' },
        user_metadata: {},
      },
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
});

// Token endpoint (password grant flow)
function handleTokenRequest(req, res) {
  try {
    const { grant_type, username, password } = getCredentials(req);

    console.log(`\n🔐 Token Request:`);
    console.log(`   grant_type: ${grant_type}`);
    console.log(`   username: ${username}`);
    console.log(`   password: ${password ? '***' : 'MISSING'}`);
    console.log(`   Users in store: ${users.size}`);

    if (grant_type !== 'password') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (!username || !password) {
      console.log(`❌ Missing credentials`);
      return res.status(400).json({ error: 'invalid_request' });
    }

    console.log(`🔍 Looking for user: ${username}`);
    let userId = null;
    for (const [id, user] of users.entries()) {
      const emailMatch = user.email === username;
      const passwordMatch = user.password === password;
      console.log(`   - ${user.email} (email: ${emailMatch}, password: ${passwordMatch})`);
      if (emailMatch && passwordMatch) {
        userId = id;
        console.log(`✅ User found!`);
        break;
      }
    }

    if (!userId) {
      console.log(`❌ User not found or password mismatch`);
      return res.status(401).json({
        error_description: 'Invalid credentials',
        error: 'invalid_grant',
      });
    }

    const sessionToken = uuidv4();
    sessions.set(sessionToken, { userId, email: username });

    console.log(`✅ Token issued: ${sessionToken.substring(0, 8)}...`);

    res.json({
      access_token: sessionToken,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: uuidv4(),
    });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: { message: err.message } });
  }
}

app.post('/auth/v1/token', handleTokenRequest);
app.post('/oauth2/token', handleTokenRequest);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', users: users.size, sessions: sessions.size });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: { message: 'Internal server error' } });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Mock Auth Server running on http://localhost:${PORT}`);
  console.log(`📝 In-Memory storage (no database required)\n`);
});
