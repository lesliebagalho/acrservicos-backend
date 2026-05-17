import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { geraToken, verificaToken } from '../middleware/auth.js';

const router = express.Router();

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

// POST /auth/login - Faz login e retorna JWT
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco
    const result = await query('SELECT id, email, senha_hash FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verificar senha. Se o banco ainda tiver senha em texto puro, aceita uma vez
    // e migra automaticamente para bcrypt.
    const senhaValida = isBcryptHash(user.senha_hash)
      ? await bcrypt.compare(senha, user.senha_hash)
      : senha === user.senha_hash;

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    if (!isBcryptHash(user.senha_hash)) {
      const senhaHash = await bcrypt.hash(senha, 10);
      await query(
        'UPDATE users SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [senhaHash, user.id]
      );
    }

    // Gerar token
    const token = geraToken(user.id, user.email);
    res.json({ token, email: user.email });
  } catch (err) {
    console.error('[Auth/Login] Erro:', err.message);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
});

// POST /auth/reset-password - Reseta senha (protegido com JWT)
router.post('/reset-password', verificaToken, async (req, res) => {
  try {
    const { email, novaSenha } = req.body;

    if (!email || !novaSenha) {
      return res.status(400).json({ erro: 'Email e nova senha são obrigatórios' });
    }

    // Verificar se email existe (segurança: só admin logado pode resetar)
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha
    await query('UPDATE users SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2', [senhaHash, email]);

    res.json({ mensagem: 'Senha resetada com sucesso' });
  } catch (err) {
    console.error('[Auth/ResetPassword] Erro:', err.message);
    res.status(500).json({ erro: 'Erro ao resetar senha' });
  }
});

export default router;
