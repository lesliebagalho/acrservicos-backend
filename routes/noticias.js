import express from 'express';
import { query } from '../db.js';
import { verificaToken } from '../middleware/auth.js';

const router = express.Router();

// GET all noticias (public) — ordenadas por data DESC
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM noticias ORDER BY date DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('[Noticias] GET all error:', err);
    res.status(500).json({ error: 'Failed to fetch noticias' });
  }
});

// GET single noticia by id (public)
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM noticias WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Noticias] GET single error:', err);
    res.status(500).json({ error: 'Failed to fetch noticia' });
  }
});

// POST create noticia (protegido)
router.post('/', verificaToken, async (req, res) => {
  const { slug, title, date, excerpt, content, image } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }
  try {
    const result = await query(
      `INSERT INTO noticias (slug, title, date, excerpt, content, image)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [slug || null, title.trim(), date || null, excerpt || null, content || null, image || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[Noticias] POST error:', err);
    res.status(500).json({ error: 'Failed to create noticia' });
  }
});

// PUT update noticia (protegido)
router.put('/:id', verificaToken, async (req, res) => {
  const { slug, title, date, excerpt, content, image } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }
  try {
    const result = await query(
      `UPDATE noticias
       SET slug = $1, title = $2, date = $3, excerpt = $4, content = $5, image = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [slug || null, title.trim(), date || null, excerpt || null, content || null, image || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Noticias] PUT error:', err);
    res.status(500).json({ error: 'Failed to update noticia' });
  }
});

// DELETE noticia (protegido)
router.delete('/:id', verificaToken, async (req, res) => {
  try {
    const result = await query('DELETE FROM noticias WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Noticia not found' });
    }
    res.json({ message: 'Noticia deleted', noticia: result.rows[0] });
  } catch (err) {
    console.error('[Noticias] DELETE error:', err);
    res.status(500).json({ error: 'Failed to delete noticia' });
  }
});

export default router;
