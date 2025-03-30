const db = require('./index');

const createTables = async () => {
  try {
    // Skapa alla tabeller inom en transaktion
    await db.query('BEGIN');

    // Skador/injuries tabell
    await db.query(`
      CREATE TABLE IF NOT EXISTS injuries (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL,
        team_id INTEGER,
        injury_date DATE NOT NULL,
        return_date DATE,
        injury_type VARCHAR(100) NOT NULL,
        injury_description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        reported_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Behandlingar/treatments tabell
    await db.query(`
      CREATE TABLE IF NOT EXISTS treatments (
        id SERIAL PRIMARY KEY,
        injury_id INTEGER NOT NULL,
        treatment_date DATE NOT NULL,
        treatment_type VARCHAR(100) NOT NULL,
        treatment_description TEXT,
        treated_by INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (injury_id) REFERENCES injuries(id) ON DELETE CASCADE
      )
    `);

    // Rehabiliteringsplaner tabell
    await db.query(`
      CREATE TABLE IF NOT EXISTS rehab_plans (
        id SERIAL PRIMARY KEY,
        injury_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'planned',
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (injury_id) REFERENCES injuries(id) ON DELETE CASCADE
      )
    `);

    // Framstegsnoteringar tabell
    await db.query(`
      CREATE TABLE IF NOT EXISTS progress_notes (
        id SERIAL PRIMARY KEY,
        rehab_plan_id INTEGER NOT NULL,
        note_date DATE NOT NULL,
        content TEXT NOT NULL,
        progress_status VARCHAR(50) NOT NULL,
        pain_level INTEGER,
        mobility_level INTEGER,
        strength_level INTEGER,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rehab_plan_id) REFERENCES rehab_plans(id) ON DELETE CASCADE
      )
    `);

    // Medicinska rapporter tabell
    await db.query(`
      CREATE TABLE IF NOT EXISTS medical_reports (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        report_date DATE NOT NULL,
        content TEXT NOT NULL,
        report_type VARCHAR(100) NOT NULL,
        confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'standard',
        attachments JSONB,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query('COMMIT');
    console.log('Databastabeller skapade/kontrollerade');
    return true;
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Fel vid initialisering av databastabeller:', error.message);
    throw error;
  }
};

const dbMigrations = {
  createTables
};

module.exports = { dbMigrations };