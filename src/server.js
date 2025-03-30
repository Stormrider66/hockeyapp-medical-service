require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const { authMiddleware } = require('./middleware/authMiddleware');
const { dbMigrations } = require('./db/migrations');

// Routes
const healthRoutes = require('./routes/healthRoutes');
const injuryRoutes = require('./routes/injuryRoutes');
const treatmentRoutes = require('./routes/treatmentRoutes');
const rehabRoutes = require('./routes/rehabRoutes');
const progressRoutes = require('./routes/progressRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Start server
async function startServer() {
  try {
    // Testa databasanslutning
    await db.query('SELECT NOW()');
    console.log('Database connection successful');
    
    // Kör migreringar vid uppstart
    try {
      await dbMigrations.createTables();
      console.log('Database migrations completed successfully');
    } catch (migrationError) {
      console.error('Error running database migrations:', migrationError.message);
      // Fortsätt ändå, då tabeller kan redan existera
    }
    
    const app = express();
    
    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    
    // Health check route - ingen auth krävs
    app.use('/health', healthRoutes);
    
    // API routes med auth
    app.use('/api/injuries', authMiddleware, injuryRoutes);
    app.use('/api/treatments', authMiddleware, treatmentRoutes);
    app.use('/api/rehab', authMiddleware, rehabRoutes);
    app.use('/api/progress', authMiddleware, progressRoutes);
    app.use('/api/reports', authMiddleware, reportRoutes);
    
    // Error handling middleware
    app.use(errorMiddleware);
    
    // Start server
    const PORT = process.env.PORT || 3005;
    app.listen(PORT, () => {
      console.log(`Medical service running on port ${PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      db.end();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      db.end();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Starta servern
startServer();