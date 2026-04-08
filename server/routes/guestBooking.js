const express = require('express');
const router = express.Router({ mergeParams: true });
const { createClient } = require('@supabase/supabase-js');
const db = require('../db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/salons/:salonId/book-guest
// Body: { email, phone, full_name, staff_id, starts_at, service_ids }
router.post('/', async (req, res) => {
  const { salonId } = req.params;
  const { email, phone, full_name, staff_id, starts_at, service_ids, notes } = req.body;

  if (!email || !full_name || !starts_at || !service_ids?.length) {
    return res.status(400).json({ error: 'email, full_name, starts_at, and service_ids are required' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Find or create the user
    let customerId;

    // Check if profile already exists by looking up email in profiles via a join-free approach
    // First try to create — if user exists, Supabase returns an error we handle
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (newUser?.user) {
      // New user created
      customerId = newUser.user.id;
      await client.query(
        `INSERT INTO profiles (id, full_name, phone, role)
         VALUES ($1, $2, $3, 'customer')
         ON CONFLICT (id) DO UPDATE SET full_name = $2, phone = $3`,
        [customerId, full_name, phone || null]
      );
    } else if (createError) {
      // User already exists — page through REST API to find them
      // Note: per_page > 5 causes 500 on this Supabase instance
      let found = null;
      for (let page = 1; !found && page <= 100; page++) {
        const resp = await fetch(
          `${process.env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=5`,
          { headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          }}
        );
        const data = await resp.json();
        const users = data.users ?? [];
        found = users.find(u => u.email === email.toLowerCase());
        if (users.length < 5) break; // last page
      }
      if (found) {
        customerId = found.id;
      } else {
        throw new Error('Could not find or create user account');
      }
    }

    // 2. Fetch services for price/duration
    const svcResult = await client.query(
      'SELECT id, price, duration_minutes FROM services WHERE id = ANY($1) AND salon_id = $2',
      [service_ids, salonId]
    );
    const services = svcResult.rows;
    if (services.length !== service_ids.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more services are invalid' });
    }

    const totalPrice = services.reduce((sum, s) => sum + parseFloat(s.price), 0);
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const endsAt = new Date(new Date(starts_at).getTime() + totalDuration * 60000);

    // 3. Check staff conflict
    if (staff_id) {
      const { rows: conflict } = await client.query(
        `SELECT id FROM bookings
         WHERE staff_id = $1 AND salon_id = $2
           AND status NOT IN ('cancelled', 'no_show')
           AND starts_at < $4 AND ends_at > $3`,
        [staff_id, salonId, starts_at, endsAt]
      );
      if (conflict.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This time slot is already booked. Please choose a different time.' });
      }
    }

    // 4. Create the booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (customer_id, staff_id, starts_at, ends_at, notes, total_price, salon_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [customerId, staff_id || null, starts_at, endsAt, notes || null, totalPrice, salonId]
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
    res.status(500).json({ error: err.message || 'Failed to create booking' });
  } finally {
    client.release();
  }
});

module.exports = router;
