const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reviews  (filter by staff_id, customer_id)
router.get('/', async (req, res) => {
  try {
    const { staff_id, customer_id } = req.query;
    let query = `
      SELECT r.*, p.full_name AS customer_name, s.full_name AS staff_name
      FROM reviews r
      LEFT JOIN profiles p ON p.id = r.customer_id
      LEFT JOIN staff s ON s.id = r.staff_id
      WHERE 1=1
    `;
    const params = [];
    if (staff_id)    { params.push(staff_id);    query += ` AND r.staff_id = $${params.length}`; }
    if (customer_id) { params.push(customer_id); query += ` AND r.customer_id = $${params.length}`; }
    query += ' ORDER BY r.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  const { booking_id, customer_id, staff_id, rating, comment } = req.body;
  if (!booking_id || !customer_id || !rating) {
    return res.status(400).json({ error: 'booking_id, customer_id, and rating are required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO reviews (booking_id, customer_id, staff_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [booking_id, customer_id, staff_id, rating, comment]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Review already exists for this booking' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// PATCH /api/reviews/:id
router.patch('/:id', async (req, res) => {
  const { rating, comment } = req.body;
  try {
    const result = await db.query(
      `UPDATE reviews
       SET rating  = COALESCE($1, rating),
           comment = COALESCE($2, comment)
       WHERE id = $3 RETURNING *`,
      [rating, comment, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

module.exports = router;
