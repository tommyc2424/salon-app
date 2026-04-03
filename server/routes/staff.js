const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/salons/:salonId/staff
router.get('/', async (req, res) => {
  const { salonId } = req.params;
  try {
    const result = await db.query(
      `SELECT s.*,
         COALESCE(json_agg(svc) FILTER (WHERE svc.id IS NOT NULL), '[]') AS services
       FROM staff s
       LEFT JOIN staff_services ss ON ss.staff_id = s.id
       LEFT JOIN services svc ON svc.id = ss.service_id
       WHERE s.salon_id = $1 AND s.is_active = true
       GROUP BY s.id
       ORDER BY s.full_name`,
      [salonId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// GET /api/salons/:salonId/staff/:id
router.get('/:id', async (req, res) => {
  const { salonId } = req.params;
  try {
    const result = await db.query(
      `SELECT s.*,
         COALESCE(json_agg(svc) FILTER (WHERE svc.id IS NOT NULL), '[]') AS services
       FROM staff s
       LEFT JOIN staff_services ss ON ss.staff_id = s.id
       LEFT JOIN services svc ON svc.id = ss.service_id
       WHERE s.id = $1 AND s.salon_id = $2
       GROUP BY s.id`,
      [req.params.id, salonId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
});

// GET /api/salons/:salonId/staff/:id/schedule
router.get('/:id/schedule', async (req, res) => {
  const { salonId } = req.params;
  try {
    const result = await db.query(
      `SELECT ss.* FROM staff_schedules ss
       JOIN staff s ON s.id = ss.staff_id
       WHERE ss.staff_id = $1 AND s.salon_id = $2
       ORDER BY ss.day_of_week`,
      [req.params.id, salonId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// PUT /api/salons/:salonId/staff/:id/services  (replace service list)
router.put('/:id/services', async (req, res) => {
  const { salonId } = req.params;
  const { service_ids } = req.body;
  if (!Array.isArray(service_ids)) return res.status(400).json({ error: 'service_ids must be an array' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Verify staff belongs to salon
    const { rows } = await client.query('SELECT id FROM staff WHERE id = $1 AND salon_id = $2', [req.params.id, salonId]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query('DELETE FROM staff_services WHERE staff_id = $1', [req.params.id]);
    for (const sid of service_ids) {
      await client.query(
        'INSERT INTO staff_services (staff_id, service_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.id, sid]
      );
    }
    await client.query('COMMIT');
    res.json({ staff_id: parseInt(req.params.id), service_ids });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update staff services' });
  } finally {
    client.release();
  }
});

// PUT /api/salons/:salonId/staff/:id/schedule  (upsert weekly schedule)
router.put('/:id/schedule', async (req, res) => {
  const { salonId } = req.params;
  const { schedule } = req.body;
  if (!Array.isArray(schedule)) return res.status(400).json({ error: 'schedule must be an array' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id FROM staff WHERE id = $1 AND salon_id = $2', [req.params.id, salonId]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    for (const slot of schedule) {
      await client.query(
        `INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time, is_available)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (staff_id, day_of_week)
         DO UPDATE SET start_time = $3, end_time = $4, is_available = $5`,
        [req.params.id, slot.day_of_week, slot.start_time, slot.end_time, slot.is_available ?? true]
      );
    }
    await client.query('COMMIT');
    const result = await db.query(
      'SELECT * FROM staff_schedules WHERE staff_id = $1 ORDER BY day_of_week',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to update schedule' });
  } finally {
    client.release();
  }
});

module.exports = router;
