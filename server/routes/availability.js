const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

const TIMES = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00',
];

// GET /api/salons/:salonId/availability?date=YYYY-MM-DD&duration=60&staff_id=1&customer_id=uuid
router.get('/', async (req, res) => {
  const { salonId } = req.params;
  const { date, duration = 60, staff_id, customer_id } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required' });

  try {
    const blocked = [];

    if (staff_id) {
      const { rows } = await db.query(
        `SELECT starts_at, ends_at FROM bookings
         WHERE starts_at::date = $1::date
           AND staff_id = $2
           AND salon_id = $3
           AND status NOT IN ('cancelled', 'no_show')`,
        [date, staff_id, salonId]
      );
      blocked.push(...rows);
    }

    if (customer_id) {
      const { rows } = await db.query(
        `SELECT starts_at, ends_at FROM bookings
         WHERE starts_at::date = $1::date
           AND customer_id = $2
           AND status NOT IN ('cancelled', 'no_show')`,
        [date, customer_id]
      );
      blocked.push(...rows);
    }

    const unavailable = TIMES.filter(t => {
      const slotStart = new Date(`${date}T${t}:00`);
      const slotEnd   = new Date(slotStart.getTime() + Number(duration) * 60000);
      return blocked.some(b =>
        new Date(b.starts_at) < slotEnd && new Date(b.ends_at) > slotStart
      );
    });

    res.json({ unavailable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

module.exports = router;
