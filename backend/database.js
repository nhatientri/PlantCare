const { Pool } = require('pg');

// Use DATABASE_URL from environment, or default to a local dev URL if not set
// Example: postgres://user:password@localhost:5432/plantcare
const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/plantcare';

const pool = new Pool({
    connectionString,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Initialize Database Tables
const initDb = async () => {
    const client = await pool.connect();
    try {
        console.log('Connected to PostgreSQL database.');

        await client.query('BEGIN');

        // 1. Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            );
        `);

        // 2. Devices Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name TEXT,
                secret TEXT
            );
        `);

        // 3. Readings Table (JSONB for sensor data)
        // Data format found in firmware: { temperature, humidity, pumpState, threshold, tankEmpty, plants: [...] }
        await client.query(`
            CREATE TABLE IF NOT EXISTS readings (
                id SERIAL PRIMARY KEY,
                device_id TEXT NOT NULL,
                data JSONB NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Index on device_id and timestamp for faster queries
        await client.query(`CREATE INDEX IF NOT EXISTS idx_readings_device_id ON readings(device_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);`);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp DESC);`);

        // 4. AI Learning Table (Persist Adaptive History)
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_learning (
                id SERIAL PRIMARY KEY,
                data_point FLOAT NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await client.query('COMMIT');
        console.log('Database tables initialized successfully.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error initializing database:', e);
    } finally {
        client.release();
    }
};

// Auto-run init removed to prevent race conditions
// initDb();

module.exports = {
    query: (text, params) => pool.query(text, params),
    init: initDb
};
