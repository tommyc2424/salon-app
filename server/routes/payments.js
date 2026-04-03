const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/payments/:booking_id
router.get('/booking/:booking_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC',
      [req.params.booking_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/payments  (record a payment)
router.post('/', async (req, res) => {
  const { booking_id, amount, method, stripe_payment_intent_id } = req.body;
  if (!booking_id || !amount) {
    return res.status(400).json({ error: 'booking_id and amount are required' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO payments (booking_id, amount, method, status, stripe_payment_intent_id, paid_at)
       VALUES ($1, $2, $3, 'paid', $4, now()) RETURNING *`,
      [booking_id, amount, method, stripe_payment_intent_id]
    );
    // Mark booking as completed on payment
    await client.query(
      "UPDATE bookings SET status = 'completed' WHERE id = $1",
      [booking_id]
    );
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    client.release();
  }
});

// PATCH /api/payments/:id/refund
router.patch('/:id/refund', async (req, res) => {
  try {
    const result = await db.query(
      "UPDATE payments SET status = 'refunded' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
});

module.exports = router;
