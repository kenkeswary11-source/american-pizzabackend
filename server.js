// Load environment variables FIRST, before any other imports
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

let connectDB;
try {
  connectDB = require('./config/database');
} catch (error) {
  console.error('Error: Cannot find ./config/database.js');
  console.error('Current working directory:', __dirname);
  console.error('Make sure the config folder exists in your repository.');
  console.error('Original error:', error.message);
  process.exit(1);
}

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }

    if (process.env.FRONTEND_URL) {
      const allowedUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
      for (const allowedUrl of allowedUrls) {
        if (origin === allowedUrl || origin.startsWith(allowedUrl)) {
          return callback(null, true);
        }
      }
    }

    if (process.env.NODE_ENV === 'production') {
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

const io = socketIo(server, {
  cors: corsOptions
});

app.set('io', io);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ❌ REMOVED LOCAL UPLOADS → Cloudinary handles everything now.

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'American Pizza API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      reviews: '/api/reviews',
      offers: '/api/offers',
      delivery: '/api/delivery',
      sales: '/api/sales'
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'American Pizza API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      reviews: '/api/reviews',
      offers: '/api/offers',
      delivery: '/api/delivery',
      sales: '/api/sales'
    }
  });
});

// Routes
try {
  app.use('/api/auth', require('./routes/authRoutes'));
  console.log('✓ Auth routes loaded');
} catch (err) {
  console.error('✗ Failed to load auth routes:', err);
}

try {
  app.use('/api/products', require('./routes/productRoutes'));
  console.log('✓ Product routes loaded');
} catch (err) {
  console.error('✗ Failed to load product routes:', err);
}

try {
  app.use('/api/orders', require('./routes/orderRoutes'));
  console.log('✓ Order routes loaded');
} catch (err) {
  console.error('✗ Failed to load order routes:', err);
}

try {
  app.use('/api/reviews', require('./routes/reviewRoutes'));
  console.log('✓ Review routes loaded');
} catch (err) {
  console.error('✗ Failed to load review routes:', err);
}

try {
  app.use('/api/offers', require('./routes/offerRoutes'));
  console.log('✓ Offer routes loaded');
} catch (err) {
  console.error('✗ Failed to load offer routes:', err);
}

try {
  app.use('/api/delivery', require('./routes/deliveryRoutes'));
  console.log('✓ Delivery routes loaded');
} catch (err) {
  console.error('✗ Failed to load delivery routes:', err);
}

try {
  app.use('/api/sales', require('./routes/salesRoutes'));
  console.log('✓ Sales routes loaded');
} catch (err) {
  console.error('✗ Failed to load sales routes:', err);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinOrderRoom', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('leaveOrderRoom', (orderId) => {
    socket.leave(`order:${orderId}`);
  });

  socket.on('joinUserRoom', (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on('leaveUserRoom', (userId) => {
    socket.leave(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
