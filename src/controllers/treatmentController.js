const db = require('../db');
const { validateTreatment } = require('../utils/validators');
const serviceClient = require('../utils/serviceClient');
const { NotFoundError, ForbiddenError } = require('../middlewares/errorHandler');

/**
 * Get all treatments
 * GET /api/treatments
 */
const getAllTreatments = async (req, res, next) => {
  try {
    const { injuryId, type, from, to, limit = 100, offset = 0 } = req.query;
    
    // Base query
    let query = `
      SELECT t.*, i.player_id, i.team_id
      FROM treatments t
      JOIN injuries i ON t.injury_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    // Add filters
    if (injuryId) {
      query += ` AND t.injury_id = $${paramIndex++}`;
      params.push(injuryId);
    }
    
    if (type) {
      query += ` AND t.treatment_type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (from) {
      query += ` AND t.treatment_date >= $${paramIndex++}`;
      params.push(from);
    }
    
    if (to) {
      query += ` AND t.treatment_date <= $${paramIndex++}`;
      params.push(to);
    }
    
    // Role-based filtering
    if (req.user.role === 'player') {
      // Players can only see their own treatments
      query += ` AND i.player_id = $${paramIndex++}`;
      params.push(req.user.userId);
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      // Coaches and team admins can only see treatments for their teams
      const userTeams = await serviceClient.getTeamPlayers(req.user.teamId, req.headers.authorization.split(' ')[1]);
      if (userTeams && userTeams.length > 0) {
        const teamIds = [req.user.teamId];
        query += ` AND i.team_id IN (${teamIds.map((_, idx) => `$${paramIndex + idx}`).join(',')})`;
        params.push(...teamIds);
        paramIndex += teamIds.length;
      } else {
        // If user is not part of any team, return empty array
        return res.json([]);
      }
    }
    // Admins and medical staff can see all treatments
    
    // Sort and limit results
    query += ` ORDER BY t.treatment_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get treatment by ID
 * GET /api/treatments/:id
 */
const getTreatmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT t.*, i.player_id, i.team_id, i.injury_type as injury_title
      FROM treatments t
      JOIN injuries i ON t.injury_id = i.id
      WHERE t.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError(`Treatment with ID ${id} not found`);
    }
    
    const treatment = result.rows[0];
    
    // Check permissions
    if (req.user.role === 'player' && treatment.player_id !== req.user.userId) {
      throw new ForbiddenError('You can only access your own treatments');
    } else if ((req.user.role === 'coach' || req.user.role === 'team-admin') && treatment.team_id) {
      if (treatment.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only access treatments for your team');
      }
    }
    
    res.json(treatment);
  } catch (error) {
    next(error);
  }
};

/**
 * Create new treatment
 * POST /api/treatments
 */
const createTreatment = async (req, res, next) => {
  try {
    // Validate input data
    const validatedData = validateTreatment(req.body);
    
    // Get injury information to check permissions
    const injuryQuery = `SELECT player_id, team_id, injury_type as title FROM injuries WHERE id = $1`;
    const injuryResult = await db.query(injuryQuery, [validatedData.injury_id]);
    
    if (injuryResult.rows.length === 0) {
      throw new NotFoundError(`Injury with ID ${validatedData.injury_id} not found`);
    }
    
    const injury = injuryResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player') {
      // Players cannot add treatments
      throw new ForbiddenError('Players cannot add treatments');
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      if (injury.team_id && injury.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only add treatments for your team');
      }
    }
    
    // Create treatment
    const insertQuery = `
      INSERT INTO treatments(
        injury_id, treatment_type, treatment_description, treatment_date, treated_by, notes
      )
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const insertParams = [
      validatedData.injury_id,
      validatedData.treatment_type,
      validatedData.treatment_description,
      validatedData.treatment_date,
      req.user.userId, // Set current user as the one who performed the treatment
      validatedData.notes
    ];
    
    const result = await db.query(insertQuery, insertParams);
    const newTreatment = result.rows[0];
    
    // Send notification to the user
    await serviceClient.sendTreatmentNotification(
      newTreatment,
      injury,
      'added',
      { id: req.user.userId, role: req.user.role },
      req.headers.authorization.split(' ')[1]
    );
    
    res.status(201).json(newTreatment);
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing treatment
 * PUT /api/treatments/:id
 */
const updateTreatment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get existing treatment with injury information
    const existingTreatmentQuery = `
      SELECT t.*, i.player_id, i.team_id, i.id as injury_id, i.injury_type as injury_title
      FROM treatments t
      JOIN injuries i ON t.injury_id = i.id
      WHERE t.id = $1
    `;
    
    const existingTreatmentResult = await db.query(existingTreatmentQuery, [id]);
    
    if (existingTreatmentResult.rows.length === 0) {
      throw new NotFoundError(`Treatment with ID ${id} not found`);
    }
    
    const existingTreatment = existingTreatmentResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player') {
      // Players cannot update treatments
      throw new ForbiddenError('Players cannot update treatments');
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      if (existingTreatment.team_id && existingTreatment.team_id !== req.user.teamId) {
        throw new ForbiddenError('You can only update treatments for your team');
      }
    }
    
    // Validate update data
    const updateData = validateTreatment({
      ...req.body,
      injury_id: existingTreatment.injury_id // Ensure injury_id doesn't change
    });
    
    // Build update query
    const updateQuery = `
      UPDATE treatments SET
        treatment_type = $1,
        treatment_description = $2,
        treatment_date = $3,
        treated_by = $4,
        notes = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    
    const updateParams = [
      updateData.treatment_type,
      updateData.treatment_description,
      updateData.treatment_date,
      updateData.treated_by || existingTreatment.treated_by,
      updateData.notes,
      id
    ];
    
    const result = await db.query(updateQuery, updateParams);
    const updatedTreatment = result.rows[0];
    
    // Send notification about the update
    const injury = {
      id: existingTreatment.injury_id,
      player_id: existingTreatment.player_id,
      injury_type: existingTreatment.injury_title
    };
    
    await serviceClient.sendTreatmentNotification(
      updatedTreatment,
      injury,
      'updated',
      { id: req.user.userId, role: req.user.role },
      req.headers.authorization.split(' ')[1]
    );
    
    res.json(updatedTreatment);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete treatment
 * DELETE /api/treatments/:id
 */
const deleteTreatment = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get treatment with injury information for permission check
    const treatmentQuery = `
      SELECT t.*, i.player_id, i.team_id 
      FROM treatments t
      JOIN injuries i ON t.injury_id = i.id
      WHERE t.id = $1
    `;
    
    const treatmentResult = await db.query(treatmentQuery, [id]);
    
    if (treatmentResult.rows.length === 0) {
      throw new NotFoundError(`Treatment with ID ${id} not found`);
    }
    
    const treatment = treatmentResult.rows[0];
    
    // Check permissions based on user role
    if (req.user.role !== 'admin' && req.user.role !== 'medical') {
      if (req.user.role === 'player') {
        throw new ForbiddenError('Players cannot delete treatments');
      } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
        if (treatment.team_id && treatment.team_id !== req.user.teamId) {
          throw new ForbiddenError('You can only delete treatments for your team');
        }
      }
    }
    
    // Delete treatment
    await db.query('DELETE FROM treatments WHERE id = $1', [id]);
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatment,
  deleteTreatment
};