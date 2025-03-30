const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, isAdmin, isTeamAdmin, isCoach, isMedicalStaff, isMedicalOrAdmin, isOwnDataOrAuthorized } = require('../middlewares/auth');

// Get all medical reports (admin, medical staff)
router.get('/', verifyToken, isMedicalOrAdmin, reportController.getAllReports);

// Get medical reports for a specific user
router.get('/user/:userId', verifyToken, isOwnDataOrAuthorized, reportController.getReportsByUserId);

// Get specific medical report by ID
router.get('/:id', verifyToken, isOwnDataOrAuthorized, reportController.getReportById);

// Create new medical report
router.post('/', verifyToken, isMedicalOrAdmin, reportController.createReport);

// Update medical report
router.put('/:id', verifyToken, isMedicalOrAdmin, reportController.updateReport);

// Delete medical report
router.delete('/:id', verifyToken, isMedicalOrAdmin, reportController.deleteReport);

module.exports = router;