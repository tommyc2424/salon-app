const { createClient } = require('@supabase/supabase-js');
const db = require('../db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = user;
  next();
}

// Verifies the user has one of the given roles in the salon from req.params.salonId
function requireSalonRole(...roles) {
  return async (req, res, next) => {
    const salonId = req.params.salonId;
    if (!salonId) return res.status(400).json({ error: 'salonId is required' });
    try {
      const { rows } = await db.query(
        `SELECT role FROM salon_memberships
         WHERE salon_id = $1 AND profile_id = $2 AND is_active = true`,
        [salonId, req.user.id]
      );
      if (!rows.length || !roles.includes(rows[0].role)) {
        return res.status(403).json({ error: 'Insufficient permissions for this salon' });
      }
      req.salonRole = rows[0].role;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

module.exports = { requireAuth, requireSalonRole };
