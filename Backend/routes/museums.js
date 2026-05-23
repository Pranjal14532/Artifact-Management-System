const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Helper for DB errors
const handleDbError = (err, res) => {
  console.error('DB Error:', err);
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Invalid country reference' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ message: 'Cannot delete: museum has linked artifacts or exhibitions' });
  }
  res.status(500).json({ message: 'Server error' });
};

// GET all museums with full detail (public)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT m.museum_id, m.name, m.city, m.state, m.year_established,
             c.name AS country_name, c.country_id
      FROM museum m
      LEFT JOIN country c ON m.country_id = c.country_id
      ORDER BY m.name
    `);
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// GET artifacts belonging to a museum (public)
router.get('/:id/artifacts', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(`
      SELECT a.artifact_id, a.name, a.age, a.image_path, a.description,
             c.name AS country_name, p.name AS period_name,
             GROUP_CONCAT(am.material) AS materials
      FROM artifact a
      LEFT JOIN country c ON a.country_id = c.country_id
      LEFT JOIN period p ON a.period_id = p.period_id
      LEFT JOIN artifactmaterial am ON a.artifact_id = am.artifact_id
      WHERE a.museum_id = ? AND a.is_deleted = 0
      GROUP BY a.artifact_id
    `, [id]);
    res.json(rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// ADD museum (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { name, city, state, year_established, country_id } = req.body;
  if (!name) return res.status(400).json({ message: 'Museum name is required' });
  try {
    const [result] = await db.execute(
      'INSERT INTO museum (name, city, state, year_established, country_id) VALUES (?, ?, ?, ?, ?)',
      [name, city || null, state || null, year_established || null, country_id || null]
    );
    res.status(201).json({ message: 'Museum created', museumId: result.insertId });
  } catch (err) {
    handleDbError(err, res);
  }
});

// UPDATE museum (admin only)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { id } = req.params;
  const { name, city, state, year_established, country_id } = req.body;
  if (!name) return res.status(400).json({ message: 'Museum name is required' });
  try {
    await db.execute(
      'UPDATE museum SET name=?, city=?, state=?, year_established=?, country_id=? WHERE museum_id=?',
      [name, city || null, state || null, year_established || null, country_id || null, id]
    );
    res.json({ message: 'Museum updated successfully' });
  } catch (err) {
    handleDbError(err, res);
  }
});

// DELETE museum (admin only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM museum WHERE museum_id = ?', [id]);
    res.json({ message: 'Museum deleted successfully' });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
