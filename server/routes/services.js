const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/salons/:salonId/services
router.get('/', async (req, res) => {
  const { salonId } = req.params;
  try {
    const { category_id, active } = req.query;
    let query = `
      SELECT s.*, c.name AS category_name
      FROM services s
      LEFT JOIN service_categories c ON c.id = s.category_id
      WHERE s.salon_id = $1
    `;
    const params = [salonId];
    if (category_id) { params.push(category_id); query += ` AND s.category_id = $${params.length}`; }
    if (active !== undefined) { params.push(active === 'true'); query += ` AND s.is_active = $${params.length}`; }
    query += ' ORDER BY c.display_order, s.name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET /api/salons/:salonId/services/:id
router.get('/:id', async (req, res) => {
  const { salonId } = req.params;
  try {
    const result = await db.query(
      `SELECT s.*, c.name AS category_name
       FROM services s
       LEFT JOIN service_categories c ON c.id = s.category_id
       WHERE s.id = $1 AND s.salon_id = $2`,
      [req.params.id, salonId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

module.exports = router;
