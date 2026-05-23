const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const auth = require('../middleware/auth');

// Create new user (Admin only)
router.post('/', auth, async (req, res) => {
  console.log('POST /api/users request received');
  if (req.user.role !== 'admin') {
    console.log('Unauthorized user attempt:', req.user);
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: 'All fields required' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO users (name, password_hash, role) VALUES (?, ?, ?)', [username, password_hash, role]);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
