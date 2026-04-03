const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/salons/:salonId/bookings
router.get('/', async (req, res) => {
  const { salonId } = req.params;
  try {
    const { customer_id, staff_id, status, date } = req.query;
    let query = `
      SELECT b.*,
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
      WHERE b.salon_id = $1
    `;
    const params = [salonId];
    if (customer_id) { params.push(customer_id); query += ` AND b.customer_id = $${params.length}`; }
    if (staff_id)    { params.push(staff_id);    query += ` AND b.staff_id = $${params.length}`; }
    if (status)      { params.push(status);      query += ` AND b.status = $${params.length}`; }
    if (date)        { params.push(date);        query += ` AND b.starts_at::date = $${params.length}::date`; }
    query += ' GROUP BY b.id, s.id ORDER BY b.starts_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id
router.get('/:id', async (req, res) => {
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
       WHERE b.id = $1
       GROUP BY b.id, s.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// POST /api/bookings
// Body: { customer_id, staff_id, starts_at, service_ids: [1,2], notes }
router.post('/', async (req, res) => {
  const { customer_id, staff_id, starts_at, service_ids, notes } = req.body;
  if (!customer_id || !starts_at || !service_ids?.length) {
    return res.status(400).json({ error: 'customer_id, starts_at, and service_ids are required' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Fetch services to calculate total and end time
    const svcResult = await client.query(
      'SELECT id, price, duration_minutes FROM services WHERE id = ANY($1)',
      [service_ids]
    );
    const services = svcResult.rows;
    if (services.length !== service_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more service_ids are invalid' });
    }

    const totalPrice = services.reduce((sum, s) => sum + parseFloat(s.price), 0);
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const endsAt = new Date(new Date(starts_at).getTime() + totalDuration * 60000);

    // Check for conflicting bookings
    if (staff_id) {
      const conflict = await client.query(
        `SELECT id FROM bookings
         WHERE staff_id = $1
           AND status NOT IN ('cancelled', 'no_show')
           AND starts_at < $3
           AND ends_at   > $2`,
        [staff_id, starts_at, endsAt]
      );
      if (conflict.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This time slot is already booked for the selected staff member. Please choose a different time.' });
      }
    }

    // Check the customer doesn't already have an overlapping booking
    const customerConflict = await client.query(
      `SELECT id FROM bookings
       WHERE customer_id = $1
         AND status NOT IN ('cancelled', 'no_show')
         AND starts_at < $3
         AND ends_at   > $2`,
      [customer_id, starts_at, endsAt]
    );
    if (customerConflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already have a booking that overlaps with this time slot.' });
    }

    const bookingResult = await client.query(
      `INSERT INTO bookings (customer_id, staff_id, starts_at, ends_at, notes, total_price, salon_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [customer_id, staff_id, starts_at, endsAt, notes, totalPrice, req.params.salonId]
    );
    const booking = bookingResult.rows[0];

    for (const svc of services) {
      await client.query(
        `INSERT INTO booking_services (booking_id, service_id, price_at_booking, duration_at_booking)
         VALUES ($1, $2, $3, $4)`,
        [booking.id, svc.id, svc.price, svc.duration_minutes]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(booking);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
  if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
  try {
    const result = await db.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// DELETE /api/bookings/:id  (cancel)
router.delete('/:id', async (req, res) => {
  try {
    await db.query(
      "UPDATE bookings SET status = 'cancelled' WHERE id = $1",
      [req.params.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
