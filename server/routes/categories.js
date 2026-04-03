const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories
router.get('/', async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM service_categories ORDER BY display_order ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  const { name, description, display_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await db.query(
      'INSERT INTO service_categories (name, description, display_order) VALUES ($1, $2, $3) RETURNING *',
      [name, description, display_order ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH /api/categories/:id
router.patch('/:id', async (req, res) => {
  const { name, description, display_order } = req.body;
  try {
    const result = await db.query(
      `UPDATE service_categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           display_order = COALESCE($3, display_order)
       WHERE id = $4 RETURNING *`,
      [name, description, display_order, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM service_categories WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
