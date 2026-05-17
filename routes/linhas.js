import express from 'express';
import { query } from '../db.js';
import { verificaToken } from '../middleware/auth.js';

const router = express.Router();

// GET all linhas
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM linhas ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch linhas' });
  }
});

// GET single linha
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM linhas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Linha not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch linha' });
  }
});

// POST create linha
router.post('/', verificaToken, async (req, res) => {
  const { nome, desc, url, image, placement } = req.body;
  console.debug('[API] linhas POST body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'INSERT INTO linhas (nome, "desc", url, image, placement) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, desc, url, image, placement || 'both']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create linha' });
  }
});

// PUT update linha
router.put('/:id', verificaToken, async (req, res) => {
  const { nome, desc, url, image, placement } = req.body;
  console.debug('[API] linhas PUT body image type/len:', typeof image, image ? String(image).slice(0,80) : null);
  try {
    const result = await query(
      'UPDATE linhas SET nome = $1, "desc" = $2, url = $3, image = $4, placement = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [nome, desc, url, image, placement || 'both', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Linha not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update linha' });
  }
});

// DELETE linha
router.delete('/:id', verificaToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM linhas WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Linha not found' });
    }
    res.json({ message: 'Linha deleted', linha: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete linha' });
  }
});

export default router;
