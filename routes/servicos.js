import express from 'express';
import { query } from '../db.js';
import { verificaToken } from '../middleware/auth.js';

const router = express.Router();

// GET all servicos
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM servicos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch servicos' });
  }
});

// GET single servico
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM servicos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servico not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch servico' });
  }
});

// POST create servico
router.post('/', verificaToken, async (req, res) => {
  const { nome, icone, desc, url, image, placement } = req.body;
  console.debug('[API] servicos POST body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'INSERT INTO servicos (nome, icone, "desc", url, image, placement) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nome, icone, desc, url, image, placement || 'both']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create servico' });
  }
});

// PUT update servico
router.put('/:id', verificaToken, async (req, res) => {
  const { nome, icone, desc, url, image, placement } = req.body;
  console.debug('[API] servicos PUT body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'UPDATE servicos SET nome = $1, icone = $2, "desc" = $3, url = $4, image = $5, placement = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [nome, icone, desc, url, image, placement || 'both', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servico not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update servico' });
  }
});

// DELETE servico
router.delete('/:id', verificaToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM servicos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servico not found' });
    }
    res.json({ message: 'Servico deleted', servico: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete servico' });
  }
});

export default router;
