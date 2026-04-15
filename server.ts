import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Google OAuth Configuration
const getOAuth2Client = (req: express.Request, res?: express.Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Derive APP_URL automatically from request headers if not set in environment
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const derivedAppUrl = `${protocol}://${host}`;
  const appUrl = (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') 
    ? process.env.APP_URL 
    : derivedAppUrl;

  const isConfigured = clientId && clientId !== 'MY_GOOGLE_CLIENT_ID' && 
                       clientSecret && clientSecret !== 'MY_GOOGLE_CLIENT_SECRET';

  if (!isConfigured) {
    const errorMsg = 'CRITICAL: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing or using placeholder values in environment variables.';
    console.error(errorMsg);
    if (res) {
      res.status(500).json({ 
        error: 'Configuração do Google ausente', 
        details: 'As chaves GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET precisam ser configuradas nos Secrets do AI Studio.' 
      });
    }
    return null;
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl.replace(/\/$/, '')}/auth/google/callback`
  );
};

// GitHub OAuth Configuration
const getGitHubConfig = (req: express.Request) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const derivedAppUrl = `${protocol}://${host}`;
  const appUrl = (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') 
    ? process.env.APP_URL 
    : derivedAppUrl;

  return {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: `${appUrl.replace(/\/$/, '')}/auth/github/callback`
  };
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// GitHub Auth Routes
app.get('/api/auth/github/url', (req, res) => {
  const { clientId, redirectUri } = getGitHubConfig(req);
  
  if (!clientId || clientId === 'MY_GITHUB_CLIENT_ID') {
    return res.status(500).json({ 
      error: 'Configuração do GitHub ausente',
      details: 'GITHUB_CLIENT_ID precisa ser configurado nos Secrets do AI Studio.' 
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'user repo',
    state: Math.random().toString(36).substring(7)
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

app.get(['/auth/github/callback', '/auth/github/callback/'], async (req, res) => {
  const { code } = req.query;
  const { clientId, clientSecret, redirectUri } = getGitHubConfig(req);

  if (!code) {
    return res.status(400).send('Código de autorização ausente.');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };

    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error || 'Falha ao obter token de acesso');
    }

    // Store token in a secure cookie
    res.cookie('github_token', tokenData.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <head><title>Autenticação GitHub</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h2 style="color: #24292f;">Conectado ao GitHub!</h2>
            <p style="color: #64748b;">Esta janela fechará automaticamente em instantes.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('GitHub Auth Error:', error);
    res.status(500).send('Falha na autenticação com GitHub.');
  }
});

app.get('/api/auth/github/status', (req, res) => {
  const token = req.cookies.github_token;
  res.json({ isAuthenticated: !!token });
});

app.post('/api/auth/github/logout', (req, res) => {
  res.clearCookie('github_token', {
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true });
});

// Debug endpoint (safe)
app.get('/api/auth/google/debug', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const derivedAppUrl = `${protocol}://${host}`;
  const appUrl = (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') ? process.env.APP_URL : derivedAppUrl;

  res.json({
    hasClientId: !!clientId && clientId !== 'MY_GOOGLE_CLIENT_ID',
    hasClientSecret: !!clientSecret && clientSecret !== 'MY_GOOGLE_CLIENT_SECRET',
    appUrl: appUrl,
    callbackUrl: `${appUrl.replace(/\/$/, '')}/auth/google/callback`,
    isDerived: !process.env.APP_URL || process.env.APP_URL === 'MY_APP_URL'
  });
});

// 1. Get Google Auth URL
app.get('/api/auth/google/url', (req, res) => {
  const client = getOAuth2Client(req, res);
  if (!client) return;

  try {
    const url = client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
        'openid'
      ],
      prompt: 'consent'
    });
    res.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Erro ao gerar URL de autenticação' });
  }
});

// 2. Google Auth Callback
app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  const { code } = req.query;
  const client = getOAuth2Client(req);
  
  if (!client) {
    return res.status(500).send('Configuração do Google ausente no servidor.');
  }

  if (!code) {
    return res.status(400).send('Código de autorização ausente (code missing).');
  }

  try {
    const { tokens } = await client.getToken(code as string);
    
    // Store tokens in a secure cookie
    res.cookie('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <html>
        <head><title>Autenticação CéliaVip</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8fafc;">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h2 style="color: #4f46e5;">Conectado com Sucesso!</h2>
            <p style="color: #64748b;">Esta janela fechará automaticamente em instantes.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send('Falha na autenticação. Verifique se as chaves do Google estão corretas no AI Studio.');
  }
});

// 3. Sync Calendar
app.post('/api/calendar/sync', async (req, res) => {
  const tokenCookie = req.cookies.google_tokens;
  if (!tokenCookie) {
    return res.status(401).json({ error: 'Não autenticado com o Google' });
  }

  const client = getOAuth2Client(req, res);
  if (!client) return;

  try {
    const tokens = JSON.parse(tokenCookie);
    client.setCredentials(tokens);

    // Handle token refresh automatically
    client.on('tokens', (newTokens) => {
      // Note: In a real app with a DB, we'd update the DB here.
      // With cookies, we can't easily update the cookie from here, 
      // but the next request will use the new tokens if we set them in the response.
    });

    const calendar = google.calendar({ version: 'v3', auth: client });
    const { tasks } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Dados de tarefas inválidos' });
    }

    // Fetch existing events to avoid duplicates (last 60 days)
    const now = new Date();
    const minDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const googleEvents = await calendar.events.list({
      calendarId: 'primary',
      timeMin: minDate.toISOString(),
      singleEvents: true,
      maxResults: 2500
    });

    const existingTitles = new Set(googleEvents.data.items?.map(e => e.summary) || []);

    const results = [];
    for (const task of tasks) {
      if (existingTitles.has(task.title)) {
        results.push({ id: task.id, status: 'skipped', reason: 'Já existe' });
        continue;
      }

      // Ensure valid date/time
      const dateStr = task.date || new Date().toISOString().split('T')[0];
      const timeStr = task.time || '09:00';
      const startDateTime = `${dateStr}T${timeStr}:00Z`;
      
      // Default duration 1 hour
      const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

      try {
        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: task.title,
            description: task.description || 'Tarefa sincronizada do CéliaVip',
            start: { dateTime: startDateTime, timeZone: 'UTC' },
            end: { dateTime: endDateTime, timeZone: 'UTC' },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: task.reminderMinutes || 15 },
                { method: 'email', minutes: 60 } // Also add email notification
              ],
            },
            status: 'confirmed',
            transparency: 'opaque'
          },
        });
        results.push({ id: task.id, status: 'synced' });
      } catch (err) {
        console.error(`Failed to sync task ${task.id}:`, err);
        results.push({ id: task.id, status: 'failed', error: err instanceof Error ? err.message : String(err) });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({ error: 'Falha na sincronização. Tente conectar novamente.' });
  }
});

// 4. Check Auth Status
app.get('/api/auth/google/status', (req, res) => {
  const tokenCookie = req.cookies.google_tokens;
  res.json({ isAuthenticated: !!tokenCookie });
});

// 5. Logout Google
app.post('/api/auth/google/logout', (req, res) => {
  res.clearCookie('google_tokens', {
    secure: true,
    sameSite: 'none'
  });
  res.json({ success: true });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    console.log(`OAuth Callback URL: ${appUrl.replace(/\/$/, '')}/auth/google/callback`);
  });
}

startServer();
