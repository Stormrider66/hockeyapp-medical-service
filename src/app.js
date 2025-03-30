const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');

// Create Express app
const app = express();

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // HTTP request logging

// Set up routes
app.use('/api', routes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'medical-service',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found` 
  });
});

module.exports = app;