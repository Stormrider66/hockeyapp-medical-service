const { ValidationError } = require('../middlewares/errorHandler');

/**
 * Validates injury data
 * @param {Object} data - The injury data to validate
 * @returns {Object} Validated and sanitized data
 * @throws {ValidationError} If validation fails
 */
const validateInjury = (data) => {
  const errors = [];
  const sanitized = {};

  // Required fields
  if (!data.player_id) {
    errors.push('Player ID is required');
  } else {
    sanitized.player_id = parseInt(data.player_id, 10);
    if (isNaN(sanitized.player_id)) {
      errors.push('Player ID must be a number');
    }
  }

  if (data.team_id) {
    sanitized.team_id = parseInt(data.team_id, 10);
    if (isNaN(sanitized.team_id)) {
      errors.push('Team ID must be a number');
    }
  }

  if (!data.injury_date) {
    errors.push('Injury date is required');
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.injury_date)) {
      errors.push('Injury date must be in YYYY-MM-DD format');
    } else {
      sanitized.injury_date = data.injury_date;
    }
  }

  if (data.return_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.return_date)) {
      errors.push('Return date must be in YYYY-MM-DD format');
    } else {
      sanitized.return_date = data.return_date;
    }
  }

  if (!data.injury_type) {
    errors.push('Injury type is required');
  } else if (typeof data.injury_type !== 'string' || data.injury_type.length > 100) {
    errors.push('Injury type must be a string with 100 characters maximum');
  } else {
    sanitized.injury_type = data.injury_type;
  }

  if (data.injury_description) {
    if (typeof data.injury_description !== 'string') {
      errors.push('Injury description must be a string');
    } else {
      sanitized.injury_description = data.injury_description;
    }
  }

  if (data.is_active !== undefined) {
    sanitized.is_active = Boolean(data.is_active);
  }

  if (data.reported_by) {
    sanitized.reported_by = parseInt(data.reported_by, 10);
    if (isNaN(sanitized.reported_by)) {
      errors.push('Reported by must be a number');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid injury data', errors);
  }

  return sanitized;
};

/**
 * Validates treatment data
 * @param {Object} data - The treatment data to validate
 * @returns {Object} Validated and sanitized data
 * @throws {ValidationError} If validation fails
 */
const validateTreatment = (data) => {
  const errors = [];
  const sanitized = {};

  // Required fields
  if (!data.injury_id) {
    errors.push('Injury ID is required');
  } else {
    sanitized.injury_id = parseInt(data.injury_id, 10);
    if (isNaN(sanitized.injury_id)) {
      errors.push('Injury ID must be a number');
    }
  }

  if (!data.treatment_date) {
    errors.push('Treatment date is required');
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.treatment_date)) {
      errors.push('Treatment date must be in YYYY-MM-DD format');
    } else {
      sanitized.treatment_date = data.treatment_date;
    }
  }

  if (!data.treatment_type) {
    errors.push('Treatment type is required');
  } else if (typeof data.treatment_type !== 'string' || data.treatment_type.length > 100) {
    errors.push('Treatment type must be a string with 100 characters maximum');
  } else {
    sanitized.treatment_type = data.treatment_type;
  }

  if (data.treatment_description) {
    if (typeof data.treatment_description !== 'string') {
      errors.push('Treatment description must be a string');
    } else {
      sanitized.treatment_description = data.treatment_description;
    }
  }

  if (data.treated_by) {
    sanitized.treated_by = parseInt(data.treated_by, 10);
    if (isNaN(sanitized.treated_by)) {
      errors.push('Treated by must be a number');
    }
  }

  if (data.notes) {
    if (typeof data.notes !== 'string') {
      errors.push('Notes must be a string');
    } else {
      sanitized.notes = data.notes;
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid treatment data', errors);
  }

  return sanitized;
};

/**
 * Validates rehab plan data
 * @param {Object} data - The rehab plan data to validate
 * @returns {Object} Validated and sanitized data
 * @throws {ValidationError} If validation fails
 */
const validateRehabPlan = (data) => {
  const errors = [];
  const sanitized = {};

  // Required fields
  if (!data.injury_id) {
    errors.push('Injury ID is required');
  } else {
    sanitized.injury_id = parseInt(data.injury_id, 10);
    if (isNaN(sanitized.injury_id)) {
      errors.push('Injury ID must be a number');
    }
  }

  if (!data.title) {
    errors.push('Title is required');
  } else if (typeof data.title !== 'string' || data.title.length > 255) {
    errors.push('Title must be a string with 255 characters maximum');
  } else {
    sanitized.title = data.title;
  }

  if (data.description) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else {
      sanitized.description = data.description;
    }
  }

  if (!data.start_date) {
    errors.push('Start date is required');
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.start_date)) {
      errors.push('Start date must be in YYYY-MM-DD format');
    } else {
      sanitized.start_date = data.start_date;
    }
  }

  if (data.end_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.end_date)) {
      errors.push('End date must be in YYYY-MM-DD format');
    } else {
      sanitized.end_date = data.end_date;
    }
  }

  if (data.status) {
    const validStatuses = ['planned', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    } else {
      sanitized.status = data.status;
    }
  }

  if (!data.created_by) {
    errors.push('Created by is required');
  } else {
    sanitized.created_by = data.created_by;
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid rehab plan data', errors);
  }

  return sanitized;
};

/**
 * Validates progress note data
 * @param {Object} data - The progress note data to validate
 * @returns {Object} Validated and sanitized data
 * @throws {ValidationError} If validation fails
 */
const validateProgressNote = (data) => {
  const errors = [];
  const sanitized = {};

  // Required fields
  if (!data.rehab_plan_id) {
    errors.push('Rehab plan ID is required');
  } else {
    sanitized.rehab_plan_id = parseInt(data.rehab_plan_id, 10);
    if (isNaN(sanitized.rehab_plan_id)) {
      errors.push('Rehab plan ID must be a number');
    }
  }

  if (!data.note_date) {
    errors.push('Note date is required');
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.note_date)) {
      errors.push('Note date must be in YYYY-MM-DD format');
    } else {
      sanitized.note_date = data.note_date;
    }
  }

  if (!data.content) {
    errors.push('Content is required');
  } else if (typeof data.content !== 'string') {
    errors.push('Content must be a string');
  } else {
    sanitized.content = data.content;
  }

  if (!data.progress_status) {
    errors.push('Progress status is required');
  } else {
    const validStatuses = ['improved', 'stable', 'worsened', 'unknown'];
    if (!validStatuses.includes(data.progress_status)) {
      errors.push(`Progress status must be one of: ${validStatuses.join(', ')}`);
    } else {
      sanitized.progress_status = data.progress_status;
    }
  }

  if (data.pain_level !== undefined) {
    sanitized.pain_level = parseInt(data.pain_level, 10);
    if (isNaN(sanitized.pain_level) || sanitized.pain_level < 0 || sanitized.pain_level > 10) {
      errors.push('Pain level must be a number between 0 and 10');
    }
  }

  if (data.mobility_level !== undefined) {
    sanitized.mobility_level = parseInt(data.mobility_level, 10);
    if (isNaN(sanitized.mobility_level) || sanitized.mobility_level < 0 || sanitized.mobility_level > 10) {
      errors.push('Mobility level must be a number between 0 and 10');
    }
  }

  if (data.strength_level !== undefined) {
    sanitized.strength_level = parseInt(data.strength_level, 10);
    if (isNaN(sanitized.strength_level) || sanitized.strength_level < 0 || sanitized.strength_level > 10) {
      errors.push('Strength level must be a number between 0 and 10');
    }
  }

  if (!data.created_by) {
    errors.push('Created by is required');
  } else {
    sanitized.created_by = data.created_by;
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid progress note data', errors);
  }

  return sanitized;
};

/**
 * Validates medical report data
 * @param {Object} data - The medical report data to validate
 * @returns {Object} Validated and sanitized data
 * @throws {ValidationError} If validation fails
 */
const validateMedicalReport = (data) => {
  const errors = [];
  const sanitized = {};

  // Required fields
  if (!data.user_id) {
    errors.push('User ID is required');
  } else {
    sanitized.user_id = data.user_id;
  }

  if (!data.title) {
    errors.push('Title is required');
  } else if (typeof data.title !== 'string' || data.title.length > 255) {
    errors.push('Title must be a string with 255 characters maximum');
  } else {
    sanitized.title = data.title;
  }

  if (!data.report_date) {
    errors.push('Report date is required');
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.report_date)) {
      errors.push('Report date must be in YYYY-MM-DD format');
    } else {
      sanitized.report_date = data.report_date;
    }
  }

  if (!data.content) {
    errors.push('Content is required');
  } else if (typeof data.content !== 'string') {
    errors.push('Content must be a string');
  } else {
    sanitized.content = data.content;
  }

  if (!data.report_type) {
    errors.push('Report type is required');
  } else if (typeof data.report_type !== 'string' || data.report_type.length > 100) {
    errors.push('Report type must be a string with 100 characters maximum');
  } else {
    sanitized.report_type = data.report_type;
  }

  if (data.confidentiality_level) {
    const validLevels = ['standard', 'sensitive', 'restricted'];
    if (!validLevels.includes(data.confidentiality_level)) {
      errors.push(`Confidentiality level must be one of: ${validLevels.join(', ')}`);
    } else {
      sanitized.confidentiality_level = data.confidentiality_level;
    }
  }

  if (data.attachments) {
    try {
      if (typeof data.attachments === 'string') {
        sanitized.attachments = JSON.parse(data.attachments);
      } else {
        sanitized.attachments = data.attachments;
      }
    } catch (error) {
      errors.push('Attachments must be valid JSON');
    }
  }

  if (!data.created_by) {
    errors.push('Created by is required');
  } else {
    sanitized.created_by = data.created_by;
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid medical report data', errors);
  }

  return sanitized;
};

module.exports = {
  validateInjury,
  validateTreatment,
  validateRehabPlan,
  validateProgressNote,
  validateMedicalReport
};