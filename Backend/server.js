const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const artifactRoutes = require('./routes/artifacts');
const exhibitionRoutes = require('./routes/exhibitions');
const miscRoutes = require('./routes/misc');
const userRoutes = require('./routes/users');
const museumRoutes = require('./routes/museums');
const suggestionRoutes = require('./routes/suggestions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'https://main.d15qehm5s025jq.amplifyapp.com'
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/exhibitions', exhibitionRoutes);
app.use('/api/misc', miscRoutes);
app.use('/api/users', userRoutes);
app.use('/api/museums', museumRoutes);
app.use('/api/suggestions', suggestionRoutes);

// Static frontend serving (optional, if we want to serve from express)
app.use(express.static(path.join(__dirname, '../Frontend')));

// Global error handler (catches multer errors, etc.)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
