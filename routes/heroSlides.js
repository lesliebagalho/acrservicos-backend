import express from 'express';
import { query } from '../db.js';
import { verificaToken } from '../middleware/auth.js';

const router = express.Router();

// GET all hero slides
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM hero_slides ORDER BY "order" ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hero slides' });
  }
});

// GET single hero slide
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM hero_slides WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hero slide not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch hero slide' });
  }
});

// POST create hero slide
router.post('/', verificaToken, async (req, res) => {
  const { eyebrow, title, desc, image, cta1_text, cta1_url, cta2_text, cta2_url, order } = req.body;
  try {
    const result = await query(
      'INSERT INTO hero_slides (eyebrow, title, "desc", image, cta1_text, cta1_url, cta2_text, cta2_url, "order") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [eyebrow, title, desc, image, cta1_text, cta1_url, cta2_text, cta2_url, order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create hero slide' });
  }
});

// PUT update hero slide
router.put('/:id', verificaToken, async (req, res) => {
  const { eyebrow, title, desc, image, cta1_text, cta1_url, cta2_text, cta2_url, order } = req.body;
  try {
    const result = await query(
      'UPDATE hero_slides SET eyebrow = $1, title = $2, "desc" = $3, image = $4, cta1_text = $5, cta1_url = $6, cta2_text = $7, cta2_url = $8, "order" = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *',
      [eyebrow, title, desc, image, cta1_text, cta1_url, cta2_text, cta2_url, order || 0, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hero slide not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update hero slide' });
  }
});

// DELETE hero slide
router.delete('/:id', verificaToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM hero_slides WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hero slide not found' });
    }
    res.json({ message: 'Hero slide deleted', slide: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete hero slide' });
  }
});

export default router;
