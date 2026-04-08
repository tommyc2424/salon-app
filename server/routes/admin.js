const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// All routes here are mounted at /api/salons/:salonId/admin
// req.params.salonId is always available

// GET /stats
router.get('/stats', async (req, res) => {
  const { salonId } = req.params;
  try {
    const [bookings, revenue, pending, customers] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM bookings WHERE salon_id = $1 AND starts_at::date = CURRENT_DATE AND status != 'cancelled'`, [salonId]),
      db.query(`SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p JOIN bookings b ON b.id = p.booking_id WHERE b.salon_id = $1 AND p.paid_at::date = CURRENT_DATE`, [salonId]),
      db.query(`SELECT COUNT(*) FROM bookings WHERE salon_id = $1 AND status = 'pending'`, [salonId]),
      db.query(`SELECT COUNT(DISTINCT customer_id) FROM bookings WHERE salon_id = $1`, [salonId]),
    ]);
    res.json({
      bookings_today:   Number(bookings.rows[0].count),
      revenue_today:    Number(revenue.rows[0].total),
      pending_bookings: Number(pending.rows[0].count),
      total_customers:  Number(customers.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /bookings
router.get('/bookings', async (req, res) => {
  const { salonId } = req.params;
  const { status, date, staff_id } = req.query;
  try {
    let query = `
      SELECT b.*,
        json_build_object('id', s.id, 'full_name', s.full_name) AS staff,
        json_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone) AS customer,
        (SELECT MAX(b2.starts_at) FROM bookings b2
         WHERE b2.customer_id = b.customer_id AND b2.salon_id = b.salon_id
           AND b2.starts_at < b.starts_at
           AND b2.status NOT IN ('cancelled', 'no_show')) AS last_visit,
        COALESCE(json_agg(
          json_build_object('name', svc.name, 'price', bs.price_at_booking)
        ) FILTER (WHERE bs.id IS NOT NULL), '[]') AS services
      FROM bookings b
      LEFT JOIN staff s ON s.id = b.staff_id
      LEFT JOIN profiles p ON p.id = b.customer_id
      LEFT JOIN booking_services bs ON bs.booking_id = b.id
      LEFT JOIN services svc ON svc.id = bs.service_id
      WHERE b.salon_id = $1
    `;
    const params = [salonId];
    if (status)   { params.push(status);   query += ` AND b.status = $${params.length}`; }
    if (date)     { params.push(date);     query += ` AND b.starts_at::date = $${params.length}::date`; }
    if (staff_id) { params.push(staff_id); query += ` AND b.staff_id = $${params.length}`; }
    query += ' GROUP BY b.id, s.id, p.id ORDER BY b.starts_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// PATCH /bookings/:id/status
router.patch('/bookings/:id/status', async (req, res) => {
  const { salonId } = req.params;
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await db.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 AND salon_id = $3 RETURNING *',
      [status, req.params.id, salonId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// GET /services
router.get('/services', async (req, res) => {
  const { salonId } = req.params;
  try {
    const result = await db.query(
      `SELECT s.*, c.name AS category_name
       FROM services s
       LEFT JOIN service_categories c ON c.id = s.category_id
       WHERE s.salon_id = $1
       ORDER BY c.display_order, s.name`,
      [salonId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /services
router.post('/services', async (req, res) => {
  const { salonId } = req.params;
  const { name, description, price, duration_minutes, category_id } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required' });
  try {
    const result = await db.query(
      `INSERT INTO services (name, description, price, duration_minutes, category_id, salon_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, duration_minutes ?? 60, category_id, salonId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// PATCH /services/:id
router.patch('/services/:id', async (req, res) => {
  const { salonId } = req.params;
  const { name, description, price, duration_minutes, category_id, is_active } = req.body;
  try {
    const result = await db.query(
      `UPDATE services SET
         name             = COALESCE($1, name),
         description      = COALESCE($2, description),
         price            = COALESCE($3, price),
         duration_minutes = COALESCE($4, duration_minutes),
         category_id      = COALESCE($5, category_id),
         is_active        = COALESCE($6, is_active)
       WHERE id = $7 AND salon_id = $8 RETURNING *`,
      [name, description, price, duration_minutes, category_id, is_active, req.params.id, salonId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE /services/:id
router.delete('/services/:id', async (req, res) => {
  const { salonId } = req.params;
  try {
    await db.query('DELETE FROM services WHERE id = $1 AND salon_id = $2', [req.params.id, salonId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// GET /staff
router.get('/staff', async (req, res) => {
  const { salonId } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM staff WHERE salon_id = $1 ORDER BY full_name',
      [salonId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST /staff
router.post('/staff', async (req, res) => {
  const { salonId } = req.params;
  const { full_name, bio, avatar_url } = req.body;
  if (!full_name) return res.status(400).json({ error: 'full_name is required' });
  try {
    const result = await db.query(
      'INSERT INTO staff (full_name, bio, avatar_url, salon_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, bio, avatar_url, salonId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create staff' });
  }
});

// PATCH /staff/:id
router.patch('/staff/:id', async (req, res) => {
  const { salonId } = req.params;
  const { full_name, bio, is_active } = req.body;
  const hasAvatar = 'avatar_url' in req.body;
  const avatar_url = req.body.avatar_url ?? null;
  try {
    const result = await db.query(
      `UPDATE staff SET
         full_name  = COALESCE($1, full_name),
         bio        = COALESCE($2, bio),
         avatar_url = CASE WHEN $3 THEN $4 ELSE avatar_url END,
         is_active  = COALESCE($5, is_active)
       WHERE id = $6 AND salon_id = $7 RETURNING *`,
      [full_name, bio, hasAvatar, avatar_url, is_active, req.params.id, salonId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// PUT /staff/:id/services — replace all service assignments
router.put('/staff/:id/services', async (req, res) => {
  const { salonId } = req.params;
  const { service_ids } = req.body;
  if (!Array.isArray(service_ids)) return res.status(400).json({ error: 'service_ids must be an array' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM staff_services WHERE staff_id = $1', [req.params.id]);
    for (const svcId of service_ids) {
      await client.query('INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2)', [req.params.id, svcId]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update staff services' });
  } finally {
    client.release();
  }
});

// GET /staff/:id/services — get service ids for a staff member
router.get('/staff/:id/services', async (req, res) => {
  try {
    const result = await db.query('SELECT service_id FROM staff_services WHERE staff_id = $1', [req.params.id]);
    res.json(result.rows.map(r => r.service_id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff services' });
  }
});

// GET /clients
router.get('/clients', async (req, res) => {
  const { salonId } = req.params;
  try {
    const result = await db.query(
      `SELECT
         p.id,
         p.full_name,
         p.phone,
         COUNT(b.id) FILTER (WHERE b.status NOT IN ('cancelled', 'no_show'))          AS visit_count,
         SUM(b.total_price) FILTER (WHERE b.status = 'completed')                     AS total_spent,
         MAX(b.starts_at)   FILTER (WHERE b.starts_at < NOW()
                                      AND b.status NOT IN ('cancelled', 'no_show'))   AS last_visit,
         MIN(b.starts_at)   FILTER (WHERE b.starts_at > NOW()
                                      AND b.status NOT IN ('cancelled'))              AS next_appointment
       FROM bookings b
       JOIN profiles p ON p.id = b.customer_id
       WHERE b.salon_id = $1
       GROUP BY p.id, p.full_name, p.phone
       ORDER BY last_visit DESC NULLS LAST`,
      [salonId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

module.exports = router;
