const db = require('../db');
const { validateRehabPlan } = require('../utils/validators');
const serviceClient = require('../utils/serviceClient');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middlewares/errorHandler');

/**
 * Get all rehabilitation plans
 * GET /api/rehab/plans
 */
const getAllRehabPlans = async (req, res, next) => {
  try {
    const { injuryId, userId, status, limit = 100, offset = 0 } = req.query;
    
    // Base query
    let query = `
      SELECT r.*, i.player_id, i.team_id, i.injury_type as injury_title
      FROM rehab_plans r
      JOIN injuries i ON r.injury_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    // Add filters
    if (injuryId) {
      query += ` AND r.injury_id = $${paramIndex++}`;
      params.push(injuryId);
    }
    
    if (userId) {
      query += ` AND i.player_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (status) {
      query += ` AND r.status = $${paramIndex++}`;
      params.push(status);
    }
    
    // Role-based filtering
    if (req.user.role === 'player') {
      // Players can only see their own plans
      query += ` AND i.player_id = $${paramIndex++}`;
      params.push(req.user.userId);
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      // Coaches and team admins can only see plans for their teams
      if (req.user.teamId) {
        query += ` AND i.team_id = $${paramIndex++}`;
        params.push(req.user.teamId);
      } else {
        // If user doesn't have a team, return empty array
        return res.json([]);
      }
    }
    // Admins and medical staff can see all plans
    
    // Sort and limit results
    query += ` ORDER BY r.start_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific rehabilitation plan
 * GET /api/rehab/plans/:id
 */
const getRehabPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get rehab plan with injury information
    const planQuery = `
      SELECT r.*, i.player_id, i.team_id, i.injury_type as injury_title
      FROM rehab_plans r
      JOIN injuries i ON r.injury_id = i.id
      WHERE r.id = $1
    `;
    
    const planResult = await db.query(planQuery, [id]);
    
    if (planResult.rows.length === 0) {
      throw new NotFoundError(`Rehabilitation plan with ID ${id} not found`);
    }
    
    const rehabPlan = planResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player' && rehabPlan.player_id !== req.user.userId) {
      throw new ForbiddenError('You can only access your own rehabilitation plans');
    } else if ((req.user.role === 'coach' || req.user.role === 'team-admin') && rehabPlan.team_id) {
      if (rehabPlan.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only access rehabilitation plans for your team');
      }
    }
    
    // Get progress notes for the rehab plan
    const progressQuery = `
      SELECT p.*
      FROM progress_notes p
      WHERE p.rehab_plan_id = $1
      ORDER BY p.note_date DESC
    `;
    
    const progressResult = await db.query(progressQuery, [id]);
    
    // Create comprehensive response with plan and progress
    const response = {
      ...rehabPlan,
      progress: progressResult.rows
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new rehabilitation plan
 * POST /api/rehab/plans
 */
const createRehabPlan = async (req, res, next) => {
  try {
    // Validate input data and add creator
    const rehabData = {
      ...req.body,
      created_by: req.user.userId
    };
    
    const validatedData = validateRehabPlan(rehabData);
    
    // Get injury information to check permissions
    const injuryQuery = `SELECT player_id, team_id, injury_type as title FROM injuries WHERE id = $1`;
    const injuryResult = await db.query(injuryQuery, [validatedData.injury_id]);
    
    if (injuryResult.rows.length === 0) {
      throw new NotFoundError(`Injury with ID ${validatedData.injury_id} not found`);
    }
    
    const injury = injuryResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player') {
      // Players cannot create rehab plans
      throw new ForbiddenError('Players cannot create rehabilitation plans');
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      if (injury.team_id && injury.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only create rehabilitation plans for your team');
      }
    }
    
    // Create rehabilitation plan
    const insertQuery = `
      INSERT INTO rehab_plans(
        injury_id, title, description, start_date, end_date,
        status, created_by
      )
      VALUES($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const insertParams = [
      validatedData.injury_id,
      validatedData.title,
      validatedData.description,
      validatedData.start_date,
      validatedData.end_date,
      validatedData.status || 'planned',
      validatedData.created_by
    ];
    
    const result = await db.query(insertQuery, insertParams);
    const newRehabPlan = result.rows[0];
    
    // Send notification to the user
    try {
      await serviceClient.sendNotification(
        injury.player_id,
        {
          title: 'New Rehabilitation Plan',
          message: `A rehabilitation plan has been created for your injury: ${injury.title}`,
          type: 'medical',
          data: { 
            rehabPlanId: newRehabPlan.id,
            injuryId: injury.id 
          }
        },
        req.headers.authorization.split(' ')[1]
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Continue despite notification error
    }
    
    res.status(201).json(newRehabPlan);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing rehabilitation plan
 * PUT /api/rehab/plans/:id
 */
const updateRehabPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get existing rehab plan with injury information
    const existingPlanQuery = `
      SELECT r.*, i.player_id, i.team_id, i.injury_type as injury_title
      FROM rehab_plans r
      JOIN injuries i ON r.injury_id = i.id
      WHERE r.id = $1
    `;
    
    const existingPlanResult = await db.query(existingPlanQuery, [id]);
    
    if (existingPlanResult.rows.length === 0) {
      throw new NotFoundError(`Rehabilitation plan with ID ${id} not found`);
    }
    
    const existingPlan = existingPlanResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player') {
      // Players cannot update rehab plans
      throw new ForbiddenError('Players cannot update rehabilitation plans');
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      if (existingPlan.team_id && existingPlan.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only update rehabilitation plans for your team');
      }
    }
    
    // Validate update data
    const updateData = req.body;
    
    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'title', 'description', 'start_date', 'end_date', 'status'
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
      UPDATE rehab_plans 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    updateValues.push(id);
    
    const result = await db.query(updateQuery, updateValues);
    const updatedPlan = result.rows[0];
    
    // If status has changed, send notification
    if (updateData.status && updateData.status !== existingPlan.status) {
      try {
        await serviceClient.sendNotification(
          existingPlan.player_id,
          {
            title: 'Rehabilitation Plan Updated',
            message: `Your rehabilitation plan status has been updated to: ${updateData.status}`,
            type: 'medical',
            data: { 
              rehabPlanId: updatedPlan.id,
              injuryId: existingPlan.injury_id 
            }
          },
          req.headers.authorization.split(' ')[1]
        );
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Continue despite notification error
      }
    }
    
    res.json(updatedPlan);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a rehabilitation plan
 * DELETE /api/rehab/plans/:id
 */
const deleteRehabPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get rehab plan with injury information to check permissions
    const planQuery = `
      SELECT r.*, i.player_id, i.team_id 
      FROM rehab_plans r
      JOIN injuries i ON r.injury_id = i.id
      WHERE r.id = $1
    `;
    
    const planResult = await db.query(planQuery, [id]);
    
    if (planResult.rows.length === 0) {
      throw new NotFoundError(`Rehabilitation plan with ID ${id} not found`);
    }
    
    const plan = planResult.rows[0];
    
    // Check permissions based on user role
    if (req.user.role !== 'admin' && req.user.role !== 'medical') {
      if (req.user.role === 'player') {
        throw new ForbiddenError('Players cannot delete rehabilitation plans');
      } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
        if (plan.team_id && plan.team_id !== req.user.teamId) {
          throw new ForbiddenError('You can only delete rehabilitation plans for your team');
        }
      }
    }
    
    // Delete rehab plan (related progress_notes will be deleted via ON DELETE CASCADE)
    await db.query('DELETE FROM rehab_plans WHERE id = $1', [id]);
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

/**
 * Add progress note to a rehabilitation plan
 * POST /api/rehab/plans/:id/progress
 */
const addProgressNote = async (req, res, next) => {
  try {
    const { id: rehab_plan_id } = req.params;
    const { note_date, content, progress_status, pain_level, mobility_level, strength_level } = req.body;
    
    // Check that the rehab plan exists and get injury information
    const planQuery = `
      SELECT r.*, i.player_id, i.team_id 
      FROM rehab_plans r
      JOIN injuries i ON r.injury_id = i.id
      WHERE r.id = $1
    `;
    
    const planResult = await db.query(planQuery, [rehab_plan_id]);
    
    if (planResult.rows.length === 0) {
      throw new NotFoundError(`Rehabilitation plan with ID ${rehab_plan_id} not found`);
    }
    
    const plan = planResult.rows[0];
    
    // Validate input
    if (!note_date) {
      throw new ValidationError('Note date is required');
    }
    
    if (!content || typeof content !== 'string') {
      throw new ValidationError('Content is required and must be a string');
    }
    
    if (!progress_status || typeof progress_status !== 'string') {
      throw new ValidationError('Progress status is required and must be a string');
    }
    
    // Players can only add progress notes to their own plans
    if (req.user.role === 'player' && plan.player_id !== req.user.userId) {
      throw new ForbiddenError('You can only add progress notes to your own rehabilitation plans');
    }
    
    // Coaches and team admins need team permission
    if ((req.user.role === 'coach' || req.user.role === 'team-admin') && plan.team_id) {
      if (plan.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only add progress notes to rehabilitation plans for your team');
      }
    }
    
    // Create progress note
    const insertQuery = `
      INSERT INTO progress_notes(
        rehab_plan_id, note_date, content, progress_status,
        pain_level, mobility_level, strength_level, created_by
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const insertParams = [
      rehab_plan_id,
      note_date,
      content,
      progress_status,
      pain_level || null,
      mobility_level || null,
      strength_level || null,
      req.user.userId
    ];
    
    const result = await db.query(insertQuery, insertParams);
    const newProgressNote = result.rows[0];
    
    // If progress note is created by someone other than the patient, send notification
    if (req.user.userId !== plan.player_id) {
      try {
        await serviceClient.sendNotification(
          plan.player_id,
          {
            title: 'New Progress Note',
            message: `A new progress note has been added to your rehabilitation plan`,
            type: 'medical',
            data: { 
              progressNoteId: newProgressNote.id,
              rehabPlanId: rehab_plan_id
            }
          },
          req.headers.authorization.split(' ')[1]
        );
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Continue despite notification error
      }
    }
    
    // If player adds a progress note, notify team staff
    if (req.user.role === 'player' && plan.team_id) {
      try {
        // Send team notification (to coaches and team admins)
        await serviceClient.sendNotification(
          plan.team_id,
          {
            title: 'New Progress Note from Player',
            message: `A player has added a new progress note to their rehabilitation plan`,
            type: 'medical',
            data: { 
              progressNoteId: newProgressNote.id,
              rehabPlanId: rehab_plan_id,
              player_id: plan.player_id
            }
          },
          req.headers.authorization.split(' ')[1]
        );
      } catch (notificationError) {
        console.error('Failed to send team notification:', notificationError);
        // Continue despite notification error
      }
    }
    
    res.status(201).json(newProgressNote);
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress notes for a rehabilitation plan
 * GET /api/rehab/plans/:id/progress
 */
const getProgressNotes = async (req, res, next) => {
  try {
    const { id: rehab_plan_id } = req.params;
    
    // Check that the rehab plan exists and get injury information
    const planQuery = `
      SELECT r.*, i.player_id, i.team_id 
      FROM rehab_plans r
      JOIN injuries i ON r.injury_id = i.id
      WHERE r.id = $1
    `;
    
    const planResult = await db.query(planQuery, [rehab_plan_id]);
    
    if (planResult.rows.length === 0) {
      throw new NotFoundError(`Rehabilitation plan with ID ${rehab_plan_id} not found`);
    }
    
    const plan = planResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player' && plan.player_id !== req.user.userId) {
      throw new ForbiddenError('You can only access progress notes for your own rehabilitation plans');
    } else if ((req.user.role === 'coach' || req.user.role === 'team-admin') && plan.team_id) {
      if (plan.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only access progress notes for rehabilitation plans in your team');
      }
    }
    
    // Get progress notes
    const notesQuery = `
      SELECT p.*
      FROM progress_notes p
      WHERE p.rehab_plan_id = $1
      ORDER BY p.note_date DESC
    `;
    
    const notesResult = await db.query(notesQuery, [rehab_plan_id]);
    res.json(notesResult.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRehabPlans,
  getRehabPlanById,
  createRehabPlan,
  updateRehabPlan,
  deleteRehabPlan,
  addProgressNote,
  getProgressNotes
};