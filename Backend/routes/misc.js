const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/countries', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM country');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/periods', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM period');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/museums', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM museum');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/materials', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT DISTINCT material FROM artifactmaterial');
    res.json(rows.map(r => r.material));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;