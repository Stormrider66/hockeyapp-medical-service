const express = require('express');
const router = express.Router();
const injuryRoutes = require('./injuryRoutes');
const treatmentRoutes = require('./treatmentRoutes');
const rehabRoutes = require('./rehabRoutes');
const progressRoutes = require('./progressRoutes');
const reportRoutes = require('./reportRoutes');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'medical-service',
    uptime: process.uptime()
  });
});

// API routes
router.use('/injuries', injuryRoutes);
router.use('/treatments', treatmentRoutes);
router.use('/rehab', rehabRoutes);
router.use('/progress', progressRoutes);
router.use('/reports', reportRoutes);

module.exports = router;