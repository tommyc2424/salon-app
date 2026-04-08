const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { requireAuth, requireSalonRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
      frameSrc: ["'self'", "https://www.google.com"],
    },
  },
}));
app.use(cors());
app.use(express.json());

// Health check — only respond to API clients, not browsers
app.get('/api/health', (_req, res) => {
  res.json({ message: 'Salon App API running' });
});

// Global routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/salons',     require('./routes/salons')); // individual routes add requireAuth as needed

// Customer cross-salon routes
app.use('/api/my', requireAuth, require('./routes/my'));

// Salon-scoped sub-router
const salonRouter = express.Router({ mergeParams: true });
salonRouter.use('/services',     require('./routes/services'));
salonRouter.use('/staff',        require('./routes/staff'));
salonRouter.use('/availability', require('./routes/availability'));
salonRouter.use('/book-guest',   require('./routes/guestBooking'));
salonRouter.use('/bookings',     requireAuth, require('./routes/bookings'));
salonRouter.use('/payments',     requireAuth, require('./routes/payments'));
salonRouter.use('/admin',
  requireAuth,
  requireSalonRole('owner', 'admin'),
  require('./routes/admin')
);

app.use('/api/salons/:salonId', salonRouter);

// Serve React frontend in production
const clientBuild = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuild));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
