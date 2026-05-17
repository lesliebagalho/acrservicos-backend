import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[Seed] Iniciando seed...');

    // Criar tabela users se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Seed] Tabela users verificada');

    // Verificar se admin já existe
    const result = await client.query('SELECT id FROM users WHERE email = $1', ['admin@mid.com']);
    
    if (result.rows.length > 0) {
      console.log('[Seed] ℹ️ Admin já existe, pulando insert');
      return;
    }

    // Criar hash da senha
    const senhaHash = await bcrypt.hash('admin123', 10);

    // Inserir primeiro admin
    await client.query(
      'INSERT INTO users (email, senha_hash) VALUES ($1, $2)',
      ['admin@mid.com', senhaHash]
    );

    console.log('[Seed] ✅ Admin criado com sucesso!');
    console.log('[Seed] Email: admin@mid.com');
    console.log('[Seed] Senha: admin123');
    console.log('[Seed] ⚠️ Altere a senha no primeiro login!');
  } catch (err) {
    console.error('[Seed] ❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
