const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/my/salons — salons this customer has at least one booking with
router.get('/salons', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (s.id) s.id, s.name, s.slug, s.logo_url, s.description, s.address, s.settings
       FROM bookings b
       JOIN salons s ON s.id = b.salon_id
       WHERE b.customer_id = $1 AND s.is_active = true
       ORDER BY s.id`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch salons' });
  }
});

// GET /api/my/bookings — all bookings for the logged-in customer across all salons
router.get('/bookings', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
         json_build_object('id', s.id, 'full_name', s.full_name) AS staff,
         COALESCE(json_agg(
           json_build_object(
             'service_id', bs.service_id,
             'name', svc.name,
             'price', bs.price_at_booking,
             'duration_minutes', bs.duration_at_booking
           )
         ) FILTER (WHERE bs.id IS NOT NULL), '[]') AS services
       FROM bookings b
       LEFT JOIN staff s ON s.id = b.staff_id
       LEFT JOIN booking_services bs ON bs.booking_id = b.id
       LEFT JOIN services svc ON svc.id = bs.service_id
       WHERE b.customer_id = $1
       GROUP BY b.id, s.id
       ORDER BY b.starts_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// PATCH /api/my/bookings/:id/status — customers can only cancel their own bookings
router.patch('/bookings/:id/status', async (req, res) => {
  const { status } = req.body;
  if (status !== 'cancelled') {
    return res.status(403).json({ error: 'Customers can only cancel bookings' });
  }
  try {
    const result = await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND customer_id = $2 RETURNING *",
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
