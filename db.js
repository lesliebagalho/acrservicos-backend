import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Construir connection string
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fallback: construir a partir de variáveis individuais
  const dbUser = process.env.DATABASE_USER || 'postgres';
  const dbPass = process.env.DATABASE_PASSWORD || '';
  const dbHost = process.env.DATABASE_HOST || 'localhost';
  const dbPort = process.env.DATABASE_PORT || '5432';
  const dbName = process.env.DATABASE_NAME || 'acrservicos';
  
  connectionString = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`;
}

// Validar connection string
if (!connectionString || typeof connectionString !== 'string' || connectionString.trim() === '') {
  throw new Error('DATABASE_URL is required and must be a non-empty string');
}

console.log('[DB] Attempting to connect with:', connectionString.replace(/:[^/]*@/, ':****@')); // Log com senha redacted

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function initDb() {
  try {
    console.log('[DB] Connecting to database...');
    const client = await pool.connect();
    console.log('[DB] Connected successfully');
    
    try {
      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(255) NOT NULL,
          setor VARCHAR(255),
          "desc" TEXT,
          url VARCHAR(255),
          image TEXT,
          placement VARCHAR(20) DEFAULT 'both',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS produtos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(255) NOT NULL,
          categoria VARCHAR(255),
          "desc" TEXT,
          image TEXT,
          placement VARCHAR(20) DEFAULT 'both',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS servicos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(255) NOT NULL,
          icone VARCHAR(255),
          "desc" TEXT,
          image TEXT,
          url VARCHAR(255),
          placement VARCHAR(20) DEFAULT 'both',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS linhas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome VARCHAR(255) NOT NULL,
          "desc" TEXT,
          url VARCHAR(255),
          image TEXT,
          placement VARCHAR(20) DEFAULT 'both',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS hero_slides (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          eyebrow VARCHAR(255),
          title TEXT NOT NULL,
          "desc" TEXT,
          image TEXT,
          cta1_text VARCHAR(255),
          cta1_url VARCHAR(255),
          cta2_text VARCHAR(255),
          cta2_url VARCHAR(255),
          "order" INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          senha_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS noticias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(255),
          title TEXT NOT NULL,
          date VARCHAR(10),
          excerpt TEXT,
          content TEXT,
          image TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('[DB] Database tables created successfully');

      // Ensure existing tables have required columns (safe for already-created DBs)
      await client.query(`ALTER TABLE clientes  ADD COLUMN IF NOT EXISTS image TEXT`);
      await client.query(`ALTER TABLE servicos  ADD COLUMN IF NOT EXISTS url   VARCHAR(255)`);
      await client.query(`ALTER TABLE servicos  ADD COLUMN IF NOT EXISTS image TEXT`);
      await client.query(`ALTER TABLE produtos  ADD COLUMN IF NOT EXISTS image TEXT`);
      await client.query(`ALTER TABLE linhas    ADD COLUMN IF NOT EXISTS url   VARCHAR(255)`);
      await client.query(`ALTER TABLE linhas    ADD COLUMN IF NOT EXISTS image TEXT`);
      await client.query(`ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS image TEXT`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[DB] Error initializing database:', err.message);
    console.error('[DB] Error code:', err.code);
    throw err;
  }
}

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export default pool;
