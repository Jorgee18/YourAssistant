import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import reminderRoutes from './routes/reminder.routes.js';
import adminRoutes from './routes/admin.routes.js';
import pushRoutes from './routes/push.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use((req, res, next) => {
  const startedAt = Date.now();
  const method = req.method;
  const path = req.originalUrl.split('?')[0];
  console.info(`HTTP ${method} ${path} started`);
  res.on('finish', () => {
    console.info(`HTTP ${method} ${path} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});
app.use(cors());
app.use(express.json());

// Endpoints de la API
app.use('/api/auth', authRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushRoutes);

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});
