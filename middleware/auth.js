import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'seu-super-secreto-alterar-em-producao';

export function verificaToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    console.error('[Auth] Token inválido:', err.message);
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

export function geraToken(userId, userEmail) {
  return jwt.sign(
    { id: userId, email: userEmail },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}
