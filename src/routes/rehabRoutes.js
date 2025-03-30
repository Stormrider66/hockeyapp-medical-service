const express = require('express');
const router = express.Router();
const rehabController = require('../controllers/rehabController');
const { verifyToken, isAdmin, isTeamAdmin, isCoach, isMedicalStaff, isMedicalOrAdmin, isOwnDataOrAuthorized } = require('../middlewares/auth');

// Get all rehab plans with filters
router.get('/plans', verifyToken, rehabController.getAllRehabPlans);

// Get specific rehab plan by ID
router.get('/plans/:id', verifyToken, isOwnDataOrAuthorized, rehabController.getRehabPlanById);

// Create new rehab plan
router.post('/plans', verifyToken, isMedicalOrAdmin, rehabController.createRehabPlan);

// Update rehab plan
router.put('/plans/:id', verifyToken, isMedicalOrAdmin, rehabController.updateRehabPlan);

// Delete rehab plan
router.delete('/plans/:id', verifyToken, isAdmin, rehabController.deleteRehabPlan);

// Get progress notes for a rehab plan
router.get('/plans/:id/progress', verifyToken, isOwnDataOrAuthorized, rehabController.getProgressNotes);

// Add progress note to a rehab plan
router.post('/plans/:id/progress', verifyToken, isOwnDataOrAuthorized, rehabController.addProgressNote);

module.exports = router;