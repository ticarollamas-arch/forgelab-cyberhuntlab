/**
 * HACKMIND — Full-Stack Server
 * Express + Vite Middlewares on Port 3000
 */

import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { globalProviderRegistry } from './server/providers/ProviderRegistry';
import { AIService } from './server/services/AIService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  const publicPathPrefix = (process.env.PUBLIC_PATH_PREFIX || '/hackmind').replace(/\/$/, '');
  app.use((req, _res, next) => {
    if (publicPathPrefix && (req.url === publicPathPrefix || req.url.startsWith(`${publicPathPrefix}/`))) {
      req.url = req.url.slice(publicPathPrefix.length) || '/';
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

function requireForgePremium(req: any, res: any, next: any) {
  if (req.path === '/api/health') return next();
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map((v: string) => v.trim()).filter(Boolean).map((v: string) => { const i = v.indexOf('='); return (i < 0 ? [v, ''] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))]) as [string, string]; }));
  const token = cookies.forgelab_user;
  const key = process.env.JWT_SECRET || process.env.ADMIN_SESSION_SECRET || '';
  let payload: any = null;
  try {
    if (token && key.length >= 32) {
      const [data, signature] = token.split('.');
      if (data && signature) {
        const expected = createHmac('sha256', key).update(data).digest('base64url');
        const a = Buffer.from(signature); const b = Buffer.from(expected);
        if (a.length === b.length && timingSafeEqual(a, b)) payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      }
    }
  } catch { payload = null; }
  if (!payload || payload.role !== 'user' || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Faça login no ForgeLab Studio para acessar este módulo.' });
    return res.redirect(302, '/login');
  }
  if (!['monthly', 'lifetime'].includes(payload.plan_type)) {
    if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Este módulo exige uma licença Premium ativa.' });
    return res.redirect(302, '/venda');
  }
  return next();
}

  app.use(requireForgePremium);

  // --- API Endpoints ---

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'HACKMIND — Winning Idea Engine',
      activeProvider: globalProviderRegistry.getActiveProvider().name,
      activeModel: globalProviderRegistry.getActiveModel(),
      timestamp: new Date().toISOString()
    });
  });

  // Providers list & health
  app.get('/api/providers', async (_req, res) => {
    try {
      const statuses = await globalProviderRegistry.getAllHealthStatuses();
      res.json({
        activeProviderId: globalProviderRegistry.getActiveProviderId(),
        providers: statuses
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao carregar provedores.' });
    }
  });

  // Set active provider
  app.post('/api/providers/set-active', (req, res) => {
    const { providerId, model, apiKey, endpoint } = req.body;
    if (!providerId) {
      return res.status(400).json({ error: 'providerId é obrigatório' });
    }

    if (apiKey !== undefined || endpoint !== undefined) {
      globalProviderRegistry.setSessionCredentials(providerId, apiKey, endpoint);
    }

    const success = globalProviderRegistry.setActiveProvider(providerId, model);
    if (!success) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }

    res.json({
      success: true,
      activeProviderId: globalProviderRegistry.getActiveProviderId(),
      activeModel: globalProviderRegistry.getActiveModel()
    });
  });

  // Test provider connection
  app.post('/api/providers/test', async (req, res) => {
    const { providerId, apiKey, endpoint } = req.body;
    const provider = globalProviderRegistry.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }

    try {
      const status = await provider.checkHealth(apiKey, endpoint);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({
        isAvailable: false,
        message: `Erro no teste: ${err.message}`
      });
    }
  });

  // Verified hackathons preset list
  app.get('/api/competitions/presets', (_req, res) => {
    res.json(AIService.getVerifiedHackathons());
  });

  // Analyze competition
  app.post('/api/competitions/analyze', (req, res) => {
    const comp = req.body;
    if (!comp || !comp.name) {
      return res.status(400).json({ error: 'Dados da competição incompletos.' });
    }
    const analysis = AIService.analyzeCompetition(comp);
    res.json(analysis);
  });

  // Generate 20 candidate hypotheses
  app.post('/api/hypotheses/generate', async (req, res) => {
    const comp = req.body;
    if (!comp || !comp.name) {
      return res.status(400).json({ error: 'Competição é obrigatória para gerar hipóteses.' });
    }

    try {
      const result = await AIService.generate20Hypotheses(comp);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Falha ao gerar hipóteses.' });
    }
  });

  // Run adversarial review
  app.post('/api/hypotheses/adversarial', (req, res) => {
    const { hypothesis, timelineHours } = req.body;
    if (!hypothesis || !hypothesis.id) {
      return res.status(400).json({ error: 'Hipótese é obrigatória para o comitê.' });
    }

    const review = AIService.runCommittee(hypothesis, timelineHours || 48);
    res.json(review);
  });

  // Build MVP execution plan
  app.post('/api/hypotheses/plan', (req, res) => {
    const { hypothesis, competition } = req.body;
    if (!hypothesis || !competition) {
      return res.status(400).json({ error: 'Hipótese e competição são obrigatórias.' });
    }

    const plan = AIService.createExecutionPlan(hypothesis, competition);
    res.json(plan);
  });

  // Export session to Markdown
  app.post('/api/export/markdown', (req, res) => {
    const session = req.body;
    if (!session || !session.competition) {
      return res.status(400).json({ error: 'Sessão inválida para exportação.' });
    }

    const markdown = AIService.exportSessionToMarkdown(session);
    res.json({ markdown });
  });

  // --- Static & Vite Middleware ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const builtDir = path.basename(__dirname) === 'dist' ? __dirname : path.resolve(__dirname, 'dist');
    app.use(express.static(builtDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(builtDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HACKMIND] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[HACKMIND] Server start failure:', err);
  process.exit(1);
});
