import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import tokenRoutes from './routes/tokens';
import balanceRoutes from './routes/balances';
import priceRoutes from './routes/prices';
import networkRoutes from './routes/networks';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration for Chrome extension
app.use(cors({
  origin: [
    /^chrome-extension:\/\/.*$/,
    /^moz-extension:\/\/.*$/,
    'http://localhost:3000',
    'https://localhost:3000',
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/tokens', tokenRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/networks', networkRoutes);

// Error handling middleware
app.use((error, req, res, _next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: {
      message: error.message || 'Internal server error',
      status: error.status || 500,
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PayCio Wallet Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
