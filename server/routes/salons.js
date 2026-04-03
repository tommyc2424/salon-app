const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireSalonRole } = require('../middleware/auth');

// GET /api/salons
router.get('/', async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM salons WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch salons' });
  }
});

// GET /api/salons/my/memberships — memberships for the logged-in user
router.get('/my/memberships', requireAuth, async (req, res) => {
  try {
    let result;
    try {
      result = await db.query(
        `SELECT sm.role, sm.salon_id, s.name, s.slug, s.logo_url, s.address, s.settings
         FROM salon_memberships sm
         JOIN salons s ON s.id = sm.salon_id
         WHERE sm.profile_id = $1 AND sm.is_active = true
         ORDER BY s.name`,
        [req.user.id]
      );
    } catch {
      // settings column not yet migrated — fall back gracefully
      result = await db.query(
        `SELECT sm.role, sm.salon_id, s.name, s.slug, s.logo_url, s.address
         FROM salon_memberships sm
         JOIN salons s ON s.id = sm.salon_id
         WHERE sm.profile_id = $1 AND sm.is_active = true
         ORDER BY s.name`,
        [req.user.id]
      );
      result.rows = result.rows.map(r => ({ ...r, settings: {} }));
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch memberships' });
  }
});

// GET /api/salons/by-slug/:slug
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM salons WHERE slug = $1 AND is_active = true', [req.params.slug]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch salon' });
  }
});

// GET /api/salons/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM salons WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch salon' });
  }
});

// POST /api/salons — create a salon; creator becomes owner
router.post('/', requireAuth, async (req, res) => {
  const { name, slug, description, address, phone, email, logo_url } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const salon = await client.query(
      `INSERT INTO salons (name, slug, description, address, phone, email, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, slug, description, address, phone, email, logo_url]
    );
    await client.query(
      `INSERT INTO salon_memberships (salon_id, profile_id, role)
       VALUES ($1, $2, 'owner')`,
      [salon.rows[0].id, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json(salon.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already taken' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create salon' });
  } finally {
    client.release();
  }
});

// PATCH /api/salons/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const { name, slug, description, address, phone, email, is_active, settings } = req.body;
  // logo_url may be explicitly null (remove) or a string (set) or absent (keep)
  const hasLogoUrl = 'logo_url' in req.body;
  const logo_url   = req.body.logo_url ?? null;

  const mem = await db.query(
    `SELECT role FROM salon_memberships WHERE salon_id = $1 AND profile_id = $2 AND is_active = true`,
    [req.params.id, req.user.id]
  );
  if (!mem.rows.length || !['owner', 'admin'].includes(mem.rows[0].role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    const result = await db.query(
      `UPDATE salons SET
         name        = COALESCE($1, name),
         slug        = COALESCE($2, slug),
         description = COALESCE($3, description),
         address     = COALESCE($4, address),
         phone       = COALESCE($5, phone),
         email       = COALESCE($6, email),
         logo_url    = CASE WHEN $7 THEN $8 ELSE logo_url END,
         is_active   = COALESCE($9, is_active),
         settings    = CASE WHEN $10::jsonb IS NOT NULL THEN settings || $10::jsonb ELSE settings END
       WHERE id = $11 RETURNING *`,
      [name, slug, description, address, phone, email,
       hasLogoUrl, logo_url,
       is_active,
       settings != null ? JSON.stringify(settings) : null,
       req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update salon' });
  }
});

// GET /api/salons/:id/members
router.get('/:id/members', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sm.*, p.full_name, p.phone
       FROM salon_memberships sm
       JOIN profiles p ON p.id = sm.profile_id
       WHERE sm.salon_id = $1
       ORDER BY sm.role, p.full_name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// POST /api/salons/:id/members — add a member
router.post('/:id/members', requireAuth, async (req, res) => {
  const { profile_id, role } = req.body;
  if (!profile_id || !role) return res.status(400).json({ error: 'profile_id and role are required' });
  const mem = await db.query(
    `SELECT role FROM salon_memberships WHERE salon_id = $1 AND profile_id = $2 AND is_active = true`,
    [req.params.id, req.user.id]
  );
  if (!mem.rows.length || !['owner', 'admin'].includes(mem.rows[0].role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    const result = await db.query(
      `INSERT INTO salon_memberships (salon_id, profile_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (salon_id, profile_id)
       DO UPDATE SET role = $3, is_active = true
       RETURNING *`,
      [req.params.id, profile_id, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// DELETE /api/salons/:id/members/:profileId
router.delete('/:id/members/:profileId', requireAuth, async (req, res) => {
  const mem = await db.query(
    `SELECT role FROM salon_memberships WHERE salon_id = $1 AND profile_id = $2 AND is_active = true`,
    [req.params.id, req.user.id]
  );
  if (!mem.rows.length || !['owner', 'admin'].includes(mem.rows[0].role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    await db.query(
      `UPDATE salon_memberships SET is_active = false WHERE salon_id = $1 AND profile_id = $2`,
      [req.params.id, req.params.profileId]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
