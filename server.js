const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./src/config/database');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cookie parser
app.use(cookieParser());

// Enable CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://royalelysaapi.jazyen.com',
  'https://royalelysaa.jazyen.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Security headers
app.use(helmet());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api/', limiter);

// Mount routers
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/rooms', require('./src/routes/roomRoutes'));
app.use('/api/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/promotions', require('./src/routes/promotionRoutes'));
app.use('/api/contact', require('./src/routes/contactRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/admin/availability', require('./src/routes/availabilityRoutes'));
app.use('/api/admin/users', require('./src/routes/userRoutes'));
app.use('/api/admin/reports', require('./src/routes/reportRoutes'));
app.use('/api/admin/staff', require('./src/routes/staffRoutes'));
app.use('/api/admin/settings', require('./src/routes/settingsRoutes'));
app.use('/api/upload', require('./src/routes/uploadRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
