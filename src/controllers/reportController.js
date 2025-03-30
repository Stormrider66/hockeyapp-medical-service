const db = require('../db');
const { validateMedicalReport } = require('../utils/validators');
const serviceClient = require('../utils/serviceClient');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middlewares/errorHandler');

/**
 * Get all medical reports
 * GET /api/reports
 */
const getAllReports = async (req, res, next) => {
  try {
    const { userId, type, from, to, limit = 100, offset = 0 } = req.query;
    
    // Base query
    let query = `
      SELECT r.*
      FROM medical_reports r
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    // Add filters
    if (userId) {
      query += ` AND r.user_id::text = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (type) {
      query += ` AND r.report_type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (from) {
      query += ` AND r.report_date >= $${paramIndex++}`;
      params.push(from);
    }
    
    if (to) {
      query += ` AND r.report_date <= $${paramIndex++}`;
      params.push(to);
    }
    
    // Role-based filtering
    if (req.user.role === 'player') {
      // Players can only see their own reports
      query += ` AND r.user_id::text = $${paramIndex++}`;
      params.push(req.user.userId);
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      // Coaches and team admins can see reports for their team members
      if (req.user.teamId) {
        // Get all users in the team
        try {
          const teamMembers = await serviceClient.getTeamPlayers(req.user.teamId, req.headers.authorization.split(' ')[1]);
          if (teamMembers && teamMembers.length > 0) {
            const memberIds = teamMembers.map(member => member.id);
            query += ` AND r.user_id::text IN (${memberIds.map((_, idx) => `$${paramIndex + idx}`).join(',')})`;
            params.push(...memberIds);
            paramIndex += memberIds.length;
          } else {
            // If no team members found, return empty array
            return res.json([]);
          }
        } catch (error) {
          console.error('Error fetching team members:', error);
          throw new Error('Failed to fetch team members');
        }
      } else {
        // If user doesn't have a team, return empty array
        return res.json([]);
      }
    }
    // Admins and medical staff can see all reports
    
    // Sort and limit results
    query += ` ORDER BY r.report_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get reports for a specific user
 * GET /api/reports/user/:userId
 */
const getReportsByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { type, from, to, limit = 100, offset = 0 } = req.query;
    
    // Check permissions
    if (req.user.role === 'player' && req.user.userId !== userId) {
      throw new ForbiddenError('You can only access your own medical reports');
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      // Coaches need to verify team permissions
      try {
        const userInfo = await serviceClient.getUserById(userId, req.headers.authorization.split(' ')[1]);
        
        if (!userInfo) {
          throw new NotFoundError('User not found');
        }
        
        if (userInfo.teamId && userInfo.teamId !== req.user.teamId) {
          throw new ForbiddenError('You can only access medical reports for players in your team');
        }
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          throw error;
        }
        console.error('Error checking user team info:', error);
        throw new Error('Failed to verify user team information');
      }
    }
    
    // Build query
    let query = `
      SELECT r.*
      FROM medical_reports r
      WHERE r.user_id::text = $1
    `;
    const params = [userId];
    let paramIndex = 2;
    
    if (type) {
      query += ` AND r.report_type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (from) {
      query += ` AND r.report_date >= $${paramIndex++}`;
      params.push(from);
    }
    
    if (to) {
      query += ` AND r.report_date <= $${paramIndex++}`;
      params.push(to);
    }
    
    query += ` ORDER BY r.report_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific medical report
 * GET /api/reports/:id
 */
const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT r.*
      FROM medical_reports r
      WHERE r.id = $1
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError(`Medical report with ID ${id} not found`);
    }
    
    const report = result.rows[0];
    
    // Check permissions
    if (req.user.role === 'player') {
      // Players can only see their own reports
      if (report.user_id.toString() !== req.user.userId.toString()) {
        throw new ForbiddenError('You can only access your own medical reports');
      }
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      // Check that the user is a member of the coach's team
      try {
        const userInfo = await serviceClient.getUserById(report.user_id, req.headers.authorization.split(' ')[1]);
        
        if (!userInfo) {
          throw new NotFoundError('User not found');
        }
        
        if (userInfo.teamId && userInfo.teamId !== req.user.teamId) {
          throw new ForbiddenError('You can only access medical reports for players in your team');
        }
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          throw error;
        }
        console.error('Error checking user team info:', error);
        throw new Error('Failed to verify user team information');
      }
    }
    
    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new medical report
 * POST /api/reports
 */
const createReport = async (req, res, next) => {
  try {
    const reportData = {
      ...req.body,
      created_by: req.user.userId
    };
    
    // Validate input data
    const validatedData = validateMedicalReport(reportData);
    
    // Check permissions
    if (req.user.role === 'player') {
      // Players cannot create medical reports
      throw new ForbiddenError('Players cannot create medical reports');
    } else if (req.user.role === 'coach' || req.user.role === 'team-admin') {
      // Check that the user belongs to the coach's team
      try {
        const userInfo = await serviceClient.getUserById(validatedData.user_id, req.headers.authorization.split(' ')[1]);
        
        if (!userInfo) {
          throw new NotFoundError('User not found');
        }
        
        if (userInfo.teamId && userInfo.teamId !== req.user.teamId) {
          throw new ForbiddenError('You can only create medical reports for players in your team');
        }
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ForbiddenError) {
          throw error;
        }
        console.error('Error checking user team info:', error);
        throw new Error('Failed to verify user team information');
      }
    }
    
    // Create report
    const query = `
      INSERT INTO medical_reports(
        user_id, title, report_date, content, report_type,
        confidentiality_level, attachments, created_by
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    let attachmentsJson = null;
    if (validatedData.attachments) {
      attachmentsJson = typeof validatedData.attachments === 'string' 
        ? validatedData.attachments 
        : JSON.stringify(validatedData.attachments);
    }
    
    const params = [
      validatedData.user_id,
      validatedData.title,
      validatedData.report_date,
      validatedData.content,
      validatedData.report_type,
      validatedData.confidentiality_level || 'standard',
      attachmentsJson,
      validatedData.created_by
    ];
    
    const result = await db.query(query, params);
    const newReport = result.rows[0];
    
    // Send notification to the user
    try {
      await serviceClient.sendNotification(
        validatedData.user_id,
        {
          title: 'New Medical Report',
          message: `A new medical report has been created: ${validatedData.title}`,
          type: 'medical',
          data: { reportId: newReport.id }
        },
        req.headers.authorization.split(' ')[1]
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Continue despite notification error
    }
    
    res.status(201).json(newReport);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing medical report
 * PUT /api/reports/:id
 */
const updateReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get existing report
    const existingReportResult = await db.query('SELECT * FROM medical_reports WHERE id = $1', [id]);
    
    if (existingReportResult.rows.length === 0) {
      throw new NotFoundError(`Medical report with ID ${id} not found`);
    }
    
    const existingReport = existingReportResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player') {
      throw new ForbiddenError('Players cannot update medical reports');
    } else if ((req.user.role === 'coach' || req.user.role === 'team-admin') && existingReport.created_by !== req.user.userId) {
      throw new ForbiddenError('You can only update reports you created');
    }
    
    // Validate update data
    const updateData = req.body;
    
    // Handle attachments if they exist
    let parsedAttachments = null;
    if (updateData.attachments) {
      try {
        if (typeof updateData.attachments === 'string') {
          parsedAttachments = JSON.parse(updateData.attachments);
        } else {
          parsedAttachments = updateData.attachments;
        }
        parsedAttachments = JSON.stringify(parsedAttachments);
      } catch (e) {
        throw new ValidationError('Invalid attachments format');
      }
    }
    
    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'title', 'report_date', 'content', 'report_type', 'confidentiality_level'
    ];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updateData[field]);
        paramIndex++;
      }
    });
    
    // Add attachments if they were provided
    if (parsedAttachments !== null) {
      updateFields.push(`attachments = $${paramIndex}`);
      updateValues.push(parsedAttachments);
      paramIndex++;
    }
    
    // Add updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 1) {
      // Only updated_at field - no actual updates
      throw new ValidationError('No fields to update');
    }
    
    const updateQuery = `
      UPDATE medical_reports 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    updateValues.push(id);
    
    const result = await db.query(updateQuery, updateValues);
    const updatedReport = result.rows[0];
    
    res.json(updatedReport);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a medical report
 * DELETE /api/reports/:id
 */
const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get report to check permissions
    const reportResult = await db.query('SELECT * FROM medical_reports WHERE id = $1', [id]);
    
    if (reportResult.rows.length === 0) {
      throw new NotFoundError(`Medical report with ID ${id} not found`);
    }
    
    const report = reportResult.rows[0];
    
    // Check permissions
    if (req.user.role === 'player') {
      throw new ForbiddenError('Players cannot delete medical reports');
    } else if ((req.user.role === 'coach' || req.user.role === 'team-admin') && report.created_by !== req.user.userId) {
      throw new ForbiddenError('You can only delete reports you created');
    }
    
    // Delete report
    await db.query('DELETE FROM medical_reports WHERE id = $1', [id]);
    
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReports,
  getReportsByUserId,
  getReportById,
  createReport,
  updateReport,
  deleteReport
};