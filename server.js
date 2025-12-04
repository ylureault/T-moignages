require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database with error handling
try {
  const { initDatabase } = require('./utils/db');
  initDatabase();
  console.log('Database initialized');
} catch (err) {
  console.error('Database initialization failed:', err);
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
let publicRoutes, adminRoutes;
try {
  publicRoutes = require('./routes/public');
  adminRoutes = require('./routes/admin');
  console.log('Routes loaded');
} catch (err) {
  console.error('Routes loading failed:', err);
  process.exit(1);
}

// Home redirect - BEFORE other routes
app.get('/', (req, res) => {
  res.redirect('https://insuffle.com');
});

// Mount routes
app.use('/t', publicRoutes);  // /t/:slug
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page non trouvée');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).send('Erreur serveur');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Form: http://localhost:${PORT}/t/[slug]`);
});
