import express from 'express';
import { query } from '../db.js';
import { verificaToken } from '../middleware/auth.js';

const router = express.Router();

// GET all clientes
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM clientes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch clientes' });
  }
});

// GET single cliente
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cliente' });
  }
});

// POST create cliente
router.post('/', verificaToken, async (req, res) => {
  const { nome, setor, desc, url, image, placement } = req.body;
  console.debug('[API] clientes POST body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'INSERT INTO clientes (nome, setor, "desc", url, image, placement) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nome, setor, desc, url, image, placement || 'both']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create cliente' });
  }
});

// PUT update cliente
router.put('/:id', verificaToken, async (req, res) => {
  const { nome, setor, desc, url, image, placement } = req.body;
  console.debug('[API] clientes PUT body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'UPDATE clientes SET nome = $1, setor = $2, "desc" = $3, url = $4, image = $5, placement = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [nome, setor, desc, url, image, placement || 'both', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update cliente' });
  }
});

// DELETE cliente
router.delete('/:id', verificaToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM clientes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente not found' });
    }
    res.json({ message: 'Cliente deleted', cliente: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete cliente' });
  }
});

export default router;
