const express = require('express');
const router = express.Router();
const injuryController = require('../controllers/injuryController');
const { verifyToken, isAdmin, isTeamAdmin, isCoach, isMedicalStaff, isMedicalOrAdmin, isOwnDataOrAuthorized } = require('../middlewares/auth');

// Get all injuries (admin, medical staff)
router.get('/', verifyToken, isMedicalOrAdmin, injuryController.getAllInjuries);

// Get injuries by team (admin, team admin, coach, medical)
router.get('/team/:teamId', verifyToken, isCoach, injuryController.getTeamInjuries);

// Get injuries by player (admin, team admin, coach, medical, own player)
router.get('/player/:playerId', verifyToken, isOwnDataOrAuthorized, injuryController.getPlayerInjuries);

// Get active injuries (admin, medical)
router.get('/active', verifyToken, isMedicalOrAdmin, injuryController.getActiveInjuries);

// Get injury by ID
router.get('/:id', verifyToken, isOwnDataOrAuthorized, injuryController.getInjuryById);

// Create new injury (medical staff, admin)
router.post('/', verifyToken, isMedicalOrAdmin, injuryController.createInjury);

// Update injury
router.put('/:id', verifyToken, isMedicalOrAdmin, injuryController.updateInjury);

// Delete injury (admin only)
router.delete('/:id', verifyToken, isAdmin, injuryController.deleteInjury);

// Mark injury as inactive/healed
router.patch('/:id/status', verifyToken, isMedicalOrAdmin, injuryController.updateInjuryStatus);

module.exports = router;