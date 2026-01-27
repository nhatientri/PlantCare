const db = require('./index');

const initDb = async () => {
  try {
    console.log("Initializing Database...");

    // Create Users Table
    await db.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
    console.log("Created 'users' table.");

    // Create Devices Table (Updated)
    await db.query(`
          CREATE TABLE IF NOT EXISTS devices (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            status VARCHAR(50),
            is_online BOOLEAN DEFAULT false,
            last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            config JSONB DEFAULT '{}'::jsonb,
            claim_token VARCHAR(255),
            nickname VARCHAR(255)
          );
        `);

    // Manual Migration (if table exists)
    try {
      await db.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS claim_token VARCHAR(255);`);
      await db.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);`);
      await db.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;`);
      await db.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;`);
      await db.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS status VARCHAR(50);`);
      await db.query(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;`);

      // Cleanup: Remove owner_id
      await db.query(`ALTER TABLE devices DROP COLUMN IF EXISTS owner_id;`);
    } catch (e) { console.log("Migration check complete."); }

    console.log("Created 'devices' table.");

    // Create Readings Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS readings (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) REFERENCES devices(device_id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        data JSONB NOT NULL
      );
    `);
    console.log("Created 'readings' table.");

    // Create User Devices Junction Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        user_id INTEGER REFERENCES users(id),
        device_id INTEGER REFERENCES devices(id),
        nickname VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, device_id)
      );
    `);
    console.log("Created 'user_devices' table.");

    // Migrate existing owners to user_devices (Idempotent-ish)
    // We check if table is empty to avoid duplicates or use ON CONFLICT
    await db.query(`
      INSERT INTO user_devices (user_id, device_id, nickname)
      SELECT owner_id, id, nickname FROM devices 
      WHERE owner_id IS NOT NULL
      ON CONFLICT (user_id, device_id) DO NOTHING;
    `);
    console.log("Migrated legacy owners to user_devices.");

    // Index on readings timestamp for faster graph queries
    await db.query(`CREATE INDEX IF NOT EXISTS idx_readings_device_time ON readings(device_id, created_at DESC);`);

    // Create System Logs Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(255) REFERENCES devices(device_id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'info', -- info, warning, error, success
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: Link system_logs to devices
    try {
      // 1. Delete logs for unknown devices to allow FK constraint
      await db.query(`DELETE FROM system_logs WHERE device_id NOT IN (SELECT device_id FROM devices);`);
      // 2. Add Constraint
      await db.query(`
            ALTER TABLE system_logs 
            ADD CONSTRAINT fk_device_id 
            FOREIGN KEY (device_id) 
            REFERENCES devices(device_id) 
            ON DELETE CASCADE;
        `);
    } catch (e) {
      // Constraint might already exist
    }
    console.log("Created 'system_logs' table.");

    // Index on logs timestamp for faster queries
    await db.query(`CREATE INDEX IF NOT EXISTS idx_logs_time ON system_logs(created_at DESC);`);

    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    process.exit();
  }
};

initDb();
