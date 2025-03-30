const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { verifyToken, isAdmin, isTeamAdmin, isCoach, isMedicalStaff, isMedicalOrAdmin, isOwnDataOrAuthorized } = require('../middlewares/auth');

// Get all progress notes for a user
router.get('/user/:userId', verifyToken, isOwnDataOrAuthorized, progressController.getUserProgressNotes);

// Get progress note by ID
router.get('/:id', verifyToken, isOwnDataOrAuthorized, progressController.getProgressNoteById);

// Update progress note
router.put('/:id', verifyToken, isOwnDataOrAuthorized, progressController.updateProgressNote);

// Delete progress note
router.delete('/:id', verifyToken, isOwnDataOrAuthorized, progressController.deleteProgressNote);

module.exports = router;