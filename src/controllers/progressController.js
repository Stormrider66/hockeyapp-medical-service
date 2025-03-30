const db = require('../db');
const serviceClient = require('../utils/serviceClient');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middlewares/errorHandler');

/**
 * Get all progress notes for a user
 * GET /api/progress/user/:userId
 */
const getUserProgressNotes = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (!userId || userId === 'undefined') {
      return res.json([]);
    }
    
    // Check permissions to read user's progress
    if (req.user.role === 'player' && req.user.userId !== userId) {
      throw new ForbiddenError('You can only access your own progress notes');
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      // Coaches need to verify team permissions
      try {
        const userInfo = await serviceClient.getUserById(userId, req.headers.authorization.split(' ')[1]);
        
        if (!userInfo) {
          throw new NotFoundError('User not found');
        }
        
        if (userInfo.teamId && userInfo.teamId !== req.user.teamId) {
          throw new ForbiddenError('You can only access progress notes for players in your team');
        }
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          throw error;
        }
        console.error('Error checking user team info:', error);
        throw new Error('Failed to verify user team information');
      }
    }
    
    // Get all rehab plans for the user
    const plansQuery = `
      SELECT rp.id FROM rehab_plans rp
      JOIN injuries i ON rp.injury_id = i.id
      WHERE i.player_id = $1
    `;
    
    const plansResult = await db.query(plansQuery, [userId]);
    
    if (plansResult.rows.length === 0) {
      return res.json([]);
    }
    
    const planIds = plansResult.rows.map(row => row.id);
    
    // Get progress notes for all rehab plans
    const notesQuery = `
      SELECT pn.*, rp.title as rehab_plan_title, i.injury_type as injury_title
      FROM progress_notes pn
      JOIN rehab_plans rp ON pn.rehab_plan_id = rp.id
      JOIN injuries i ON rp.injury_id = i.id
      WHERE pn.rehab_plan_id IN (${planIds.map((_, idx) => `$${idx + 1}`).join(',')})
      ORDER BY pn.note_date DESC
    `;
    
    const notesResult = await db.query(notesQuery, planIds);
    
    res.json(notesResult.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific progress note
 * GET /api/progress/:id
 */
const getProgressNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT pn.*, rp.title as rehab_plan_title, i.player_id, i.team_id, i.injury_type as injury_title
      FROM progress_notes pn
      JOIN rehab_plans rp ON pn.rehab_plan_id = rp.id
      JOIN injuries i ON rp.injury_id = i.id
      WHERE pn.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError(`Progress note with ID ${id} not found`);
    }
    
    const note = result.rows[0];
    
    // Check permissions
    if (req.user.role === 'player' && note.player_id !== req.user.userId) {
      throw new ForbiddenError('You can only access your own progress notes');
    } else if ((req.user.role === 'coach' || req.user.role === 'team-admin') && note.team_id) {
      if (note.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only access progress notes for players in your team');
      }
    }
    
    res.json(note);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a progress note
 * PUT /api/progress/:id
 */
const updateProgressNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get existing note with info about rehab plan and injury
    const existingNoteQuery = `
      SELECT pn.*, i.player_id, i.team_id
      FROM progress_notes pn
      JOIN rehab_plans rp ON pn.rehab_plan_id = rp.id
      JOIN injuries i ON rp.injury_id = i.id
      WHERE pn.id = $1
    `;
    
    const existingNoteResult = await db.query(existingNoteQuery, [id]);
    
    if (existingNoteResult.rows.length === 0) {
      throw new NotFoundError(`Progress note with ID ${id} not found`);
    }
    
    const existingNote = existingNoteResult.rows[0];
    
    // Check permissions
    // Users can only update their own notes unless they're admin/medical
    if (existingNote.created_by !== req.user.userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'medical') {
      // Coaches can update notes if they have team access
      if ((req.user.role === 'coach' || req.user.role === 'team-admin') && existingNote.team_id) {
        if (existingNote.team_id !== req.user.teamId) {
          throw new ForbiddenError('You can only update progress notes for players in your team');
        }
      } else {
        throw new ForbiddenError('You can only update your own progress notes');
      }
    }
    
    // Validate update data
    const updateData = req.body;
    
    if (updateData.note_date && typeof updateData.note_date !== 'string') {
      throw new ValidationError('Invalid note date format');
    }
    
    if (updateData.content && typeof updateData.content !== 'string') {
      throw new ValidationError('Content must be a string');
    }
    
    if (updateData.progress_status && typeof updateData.progress_status !== 'string') {
      throw new ValidationError('Progress status must be a string');
    }
    
    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'note_date', 'content', 'progress_status', 'pain_level', 
      'mobility_level', 'strength_level'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updateData[field]);
        paramIndex++;
      }
    });
    
    // Add updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 1) {
      // Only updated_at field - no actual updates
      throw new ValidationError('No fields to update');
    }
    
    const updateQuery = `
      UPDATE progress_notes 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    updateValues.push(id);
    
    const result = await db.query(updateQuery, updateValues);
    const updatedNote = result.rows[0];
    
    res.json(updatedNote);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a progress note
 * DELETE /api/progress/:id
 */
const deleteProgressNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get note with info about rehab plan and injury for permission check
    const noteQuery = `
      SELECT pn.*, i.player_id, i.team_id 
      FROM progress_notes pn
      JOIN rehab_plans rp ON pn.rehab_plan_id = rp.id
      JOIN injuries i ON rp.injury_id = i.id
      WHERE pn.id = $1
    `;
    
    const noteResult = await db.query(noteQuery, [id]);
    
    if (noteResult.rows.length === 0) {
      throw new NotFoundError(`Progress note with ID ${id} not found`);
    }
    
    const note = noteResult.rows[0];
    
    // Check permissions
    if (note.created_by !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'medical') {
      // Coaches need team permission
      if ((req.user.role === 'coach' || req.user.role === 'team-admin') && note.team_id) {
        if (note.team_id !== req.user.teamId) {
          throw new ForbiddenError('You can only delete progress notes for players in your team');
        }
      } else {
        throw new ForbiddenError('You can only delete your own progress notes');
      }
    }
    
    // Delete the note
    await db.query('DELETE FROM progress_notes WHERE id = $1', [id]);
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProgressNotes,
  getProgressNoteById,
  updateProgressNote,
  deleteProgressNote
};