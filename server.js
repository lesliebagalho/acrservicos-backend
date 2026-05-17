import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import clientesRoutes from './routes/clientes.js';
import produtosRoutes from './routes/produtos.js';
import servicosRoutes from './routes/servicos.js';
import heroSlidesRoutes from './routes/heroSlides.js';
import linhasRoutes from './routes/linhas.js';
import contatoRoutes from './routes/contato.js';
import noticiasRoutes from './routes/noticias.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, normalizedOrigin);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas de autenticação (sem proteção)
app.use('/auth', authRoutes);

// GETs publicos para o site; escrita protegida dentro de cada rota.
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/hero-slides', heroSlidesRoutes);
app.use('/api/linhas', linhasRoutes);
app.use('/api/contato', contatoRoutes);
app.use('/api/noticias', noticiasRoutes);

// Initialize database and start server
(async () => {
  try {
    console.log('[Server] Initializing database...');
    await initDb();
    console.log('[Server] Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`[Server] ✅ Server running on port ${PORT}`);
      console.log(`[Server] Frontend URL(s): ${allowedOrigins.join(', ')}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[Server] ❌ Failed to start server:', err.message);
    if (err.code === 'ERR_INVALID_URL') {
      console.error('[Server] Invalid DATABASE_URL. Check your environment variables.');
    }
    console.error('[Server] Full error:', err);
    process.exit(1);
  }
})();
