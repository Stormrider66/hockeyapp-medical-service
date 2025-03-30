const express = require('express');
const router = express.Router();
const treatmentController = require('../controllers/treatmentController');
const { verifyToken, isAdmin, isTeamAdmin, isCoach, isMedicalStaff, isMedicalOrAdmin, isOwnDataOrAuthorized } = require('../middlewares/auth');

// Get all treatments with optional filters
router.get('/', verifyToken, treatmentController.getAllTreatments);

// Get treatment by ID
router.get('/:id', verifyToken, treatmentController.getTreatmentById);

// Create new treatment
router.post('/', verifyToken, isMedicalOrAdmin, treatmentController.createTreatment);

// Update treatment
router.put('/:id', verifyToken, isMedicalOrAdmin, treatmentController.updateTreatment);

// Delete treatment
router.delete('/:id', verifyToken, isMedicalOrAdmin, treatmentController.deleteTreatment);

module.exports = router;