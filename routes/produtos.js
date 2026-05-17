import express from 'express';
import { query } from '../db.js';
import { verificaToken } from '../middleware/auth.js';

const router = express.Router();

// GET all produtos
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM produtos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch produtos' });
  }
});

// GET single produto
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch produto' });
  }
});

// POST create produto
router.post('/', verificaToken, async (req, res) => {
  const { nome, categoria, desc, image, placement } = req.body;
  console.debug('[API] produtos POST body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'INSERT INTO produtos (nome, categoria, "desc", image, placement) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, categoria, desc, image, placement || 'both']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create produto' });
  }
});

// PUT update produto
router.put('/:id', verificaToken, async (req, res) => {
  const { nome, categoria, desc, image, placement } = req.body;
  console.debug('[API] produtos PUT body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'UPDATE produtos SET nome = $1, categoria = $2, "desc" = $3, image = $4, placement = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [nome, categoria, desc, image, placement || 'both', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update produto' });
  }
});

// DELETE produto
router.delete('/:id', verificaToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM produtos WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto not found' });
    }
    res.json({ message: 'Produto deleted', produto: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete produto' });
  }
});

export default router;
