const db = require('../db');
const { validateInjury } = require('../utils/validators');
const serviceClient = require('../utils/serviceClient');
const { NotFoundError } = require('../middlewares/errorHandler');

// Get all injuries
const getAllInjuries = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT i.*, 
             u1.first_name || ' ' || u1.last_name AS player_name,
             u2.first_name || ' ' || u2.last_name AS reported_by_name,
             t.name AS team_name
      FROM injuries i
      LEFT JOIN user_service.users u1 ON i.player_id = u1.id
      LEFT JOIN user_service.users u2 ON i.reported_by = u2.id
      LEFT JOIN user_service.teams t ON i.team_id = t.id
      ORDER BY i.injury_date DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get injuries by team
const getTeamInjuries = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    
    const result = await db.query(`
      SELECT i.*, 
             u1.first_name || ' ' || u1.last_name AS player_name,
             u2.first_name || ' ' || u2.last_name AS reported_by_name
      FROM injuries i
      LEFT JOIN user_service.users u1 ON i.player_id = u1.id
      LEFT JOIN user_service.users u2 ON i.reported_by = u2.id
      WHERE i.team_id = $1
      ORDER BY i.injury_date DESC
    `, [teamId]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get injuries by player
const getPlayerInjuries = async (req, res, next) => {
  try {
    const { playerId } = req.params;
    
    const result = await db.query(`
      SELECT i.*, 
             u1.first_name || ' ' || u1.last_name AS player_name,
             u2.first_name || ' ' || u2.last_name AS reported_by_name,
             t.name AS team_name
      FROM injuries i
      LEFT JOIN user_service.users u1 ON i.player_id = u1.id
      LEFT JOIN user_service.users u2 ON i.reported_by = u2.id
      LEFT JOIN user_service.teams t ON i.team_id = t.id
      WHERE i.player_id = $1
      ORDER BY i.injury_date DESC
    `, [playerId]);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get active injuries
const getActiveInjuries = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT i.*, 
             u1.first_name || ' ' || u1.last_name AS player_name,
             u2.first_name || ' ' || u2.last_name AS reported_by_name,
             t.name AS team_name
      FROM injuries i
      LEFT JOIN user_service.users u1 ON i.player_id = u1.id
      LEFT JOIN user_service.users u2 ON i.reported_by = u2.id
      LEFT JOIN user_service.teams t ON i.team_id = t.id
      WHERE i.is_active = true
      ORDER BY i.injury_date DESC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

// Get injury by ID
const getInjuryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT i.*, 
             u1.first_name || ' ' || u1.last_name AS player_name,
             u2.first_name || ' ' || u2.last_name AS reported_by_name,
             t.name AS team_name
      FROM injuries i
      LEFT JOIN user_service.users u1 ON i.player_id = u1.id
      LEFT JOIN user_service.users u2 ON i.reported_by = u2.id
      LEFT JOIN user_service.teams t ON i.team_id = t.id
      WHERE i.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError(`Injury with ID ${id} not found`);
    }

    // Get treatments for this injury
    const treatments = await db.query(`
      SELECT t.*, u.first_name || ' ' || u.last_name AS treated_by_name
      FROM treatments t
      LEFT JOIN user_service.users u ON t.treated_by = u.id
      WHERE t.injury_id = $1
      ORDER BY t.treatment_date DESC
    `, [id]);

    // Get rehab plans for this injury
    const rehabPlans = await db.query(`
      SELECT rp.*, u.first_name || ' ' || u.last_name AS created_by_name
      FROM rehab_plans rp
      LEFT JOIN user_service.users u ON rp.created_by = u.id::uuid
      WHERE rp.injury_id = $1
      ORDER BY rp.start_date DESC
    `, [id]);
    
    const injury = result.rows[0];
    injury.treatments = treatments.rows;
    injury.rehab_plans = rehabPlans.rows;
    
    res.status(200).json(injury);
  } catch (error) {
    next(error);
  }
};

// Create new injury
const createInjury = async (req, res, next) => {
  try {
    const validatedData = validateInjury(req.body);
    
    // Add the user who reported the injury
    validatedData.reported_by = req.user.userId;
    
    const result = await db.query(`
      INSERT INTO injuries (
        player_id, team_id, injury_date, return_date, 
        injury_type, injury_description, is_active, reported_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *
    `, [
      validatedData.player_id,
      validatedData.team_id,
      validatedData.injury_date,
      validatedData.return_date,
      validatedData.injury_type,
      validatedData.injury_description,
      validatedData.is_active !== undefined ? validatedData.is_active : true,
      validatedData.reported_by
    ]);
    
    const newInjury = result.rows[0];
    
    // Send notification about the new injury
    await serviceClient.sendInjuryNotification(
      newInjury, 
      'created', 
      { id: req.user.userId, role: req.user.role }, 
      req.headers.authorization.split(' ')[1]
    );
    
    res.status(201).json(newInjury);
  } catch (error) {
    next(error);
  }
};

// Update injury
const updateInjury = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = validateInjury(req.body);
    
    // Check if injury exists
    const checkResult = await db.query('SELECT * FROM injuries WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      throw new NotFoundError(`Injury with ID ${id} not found`);
    }
    
    const result = await db.query(`
      UPDATE injuries SET
        player_id = $1,
        team_id = $2,
        injury_date = $3,
        return_date = $4,
        injury_type = $5,
        injury_description = $6,
        is_active = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      validatedData.player_id,
      validatedData.team_id,
      validatedData.injury_date,
      validatedData.return_date,
      validatedData.injury_type,
      validatedData.injury_description,
      validatedData.is_active !== undefined ? validatedData.is_active : checkResult.rows[0].is_active,
      id
    ]);
    
    const updatedInjury = result.rows[0];
    
    // Send notification about the updated injury
    await serviceClient.sendInjuryNotification(
      updatedInjury, 
      'updated', 
      { id: req.user.userId, role: req.user.role }, 
      req.headers.authorization.split(' ')[1]
    );
    
    res.status(200).json(updatedInjury);
  } catch (error) {
    next(error);
  }
};

// Delete injury
const deleteInjury = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if injury exists
    const checkResult = await db.query('SELECT * FROM injuries WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      throw new NotFoundError(`Injury with ID ${id} not found`);
    }
    
    // Delete the injury
    await db.query('DELETE FROM injuries WHERE id = $1', [id]);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Update injury status (active/inactive)
const updateInjuryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active, return_date } = req.body;
    
    if (is_active === undefined) {
      return res.status(400).json({ message: 'is_active field is required' });
    }
    
    // Check if injury exists
    const checkResult = await db.query('SELECT * FROM injuries WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      throw new NotFoundError(`Injury with ID ${id} not found`);
    }
    
    const result = await db.query(`
      UPDATE injuries SET
        is_active = $1,
        return_date = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [
      is_active,
      return_date || checkResult.rows[0].return_date,
      id
    ]);
    
    const updatedInjury = result.rows[0];
    
    // Send notification about the status update
    const action = is_active ? 'reactivated' : 'marked as healed';
    await serviceClient.sendInjuryNotification(
      updatedInjury, 
      action, 
      { id: req.user.userId, role: req.user.role }, 
      req.headers.authorization.split(' ')[1]
    );
    
    res.status(200).json(updatedInjury);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllInjuries,
  getTeamInjuries,
  getPlayerInjuries,
  getActiveInjuries,
  getInjuryById,
  createInjury,
  updateInjury,
  deleteInjury,
  updateInjuryStatus
};