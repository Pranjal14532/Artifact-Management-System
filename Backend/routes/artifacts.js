const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { validateArtifact } = require('../middleware/validation');

// Multer setup with file filtering
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and WEBP are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper for MySQL errors
const handleDbError = (err, res) => {
  console.error('DB Error:', err);
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'Invalid reference (Check ID for country, period or museum)' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ message: 'Cannot delete: record is referenced by other items' });
  }
  res.status(500).json({ message: 'Server error' });
};

// Get all artifacts with filters and pagination
router.get('/', async (req, res) => {
  const { country, period, material, search, sort = 'name', order = 'ASC', page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT a.*, c.name as country_name, p.name as period_name, m.name as museum_name,
    GROUP_CONCAT(am.material) as materials
    FROM artifact a
    LEFT JOIN country c ON a.country_id = c.country_id
    LEFT JOIN period p ON a.period_id = p.period_id
    LEFT JOIN museum m ON a.museum_id = m.museum_id
    LEFT JOIN artifactmaterial am ON a.artifact_id = am.artifact_id
    WHERE a.is_deleted = 0
  `;
  const params = [];

  if (country) {
    query += ' AND c.name = ?';
    params.push(country);
  }
  if (period) {
    query += ' AND p.name = ?';
    params.push(period);
  }
  if (material) {
    query += ' AND am.material = ?';
    params.push(material);
  }
  if (search) {
    query += ' AND (a.name LIKE ? OR a.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // Sorting
  const allowedSortFields = ['name', 'age'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'name';
  const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  query += ` GROUP BY a.artifact_id ORDER BY a.${sortField} ${sortOrder} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

  try {
    const [rows] = await db.query(query, params);
    
    for (let artifact of rows) {
      const [exhibitions] = await db.query(`
        SELECT e.name FROM exhibition e
        JOIN exhibitionartifact ea ON e.exhibition_id = ea.exhibition_id
        WHERE ea.artifact_id = ?
      `, [artifact.artifact_id]);
      artifact.exhibitions = exhibitions.map(e => e.name);
    }

    const [countRows] = await db.query('SELECT COUNT(*) as total FROM artifact WHERE is_deleted = 0');
    const total = countRows[0].total;

    res.json({
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    handleDbError(error, res);
  }
});

// Get artifact logs (Admin only)
router.get('/logs', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const [rows] = await db.execute('SELECT * FROM artifactlog ORDER BY action_time DESC');
    res.json(rows);
  } catch (error) {
    handleDbError(error, res);
  }
});

// Add artifact (Admin only)
router.post('/', auth, upload.single('image'), validateArtifact, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { name, age, country_id, period_id, museum_id, materials, description } = req.body;
  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [result] = await db.execute(
      'INSERT INTO artifact (name, age, country_id, period_id, museum_id, added_by, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, age, country_id, period_id, museum_id, req.user.id, image_path, description || null]
    );

    const artifactId = result.insertId;
    if (materials) {
      const materialsList = typeof materials === 'string' ? JSON.parse(materials) : materials;
      for (let mat of materialsList) {
        await db.execute('INSERT INTO artifactmaterial (artifact_id, material) VALUES (?, ?)', [artifactId, mat]);
      }
    }
    res.status(201).json({ message: 'Artifact added', artifactId });
  } catch (error) {
    handleDbError(error, res);
  }
});

// Update artifact (Admin only)
router.put('/:id', auth, upload.single('image'), validateArtifact, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { id } = req.params;
  const { name, age, country_id, period_id, museum_id, materials, description } = req.body;
  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    let query = 'UPDATE artifact SET name=?, age=?, country_id=?, period_id=?, museum_id=?, description=?';
    const params = [name, age, country_id, period_id, museum_id, description || null];

    if (image_path) {
      query += ', image_path=?';
      params.push(image_path);
    }

    query += ' WHERE artifact_id=? AND is_deleted = 0';
    params.push(id);

    await db.execute(query, params);

    if (materials) {
      await db.execute('DELETE FROM artifactmaterial WHERE artifact_id = ?', [id]);
      const materialsList = typeof materials === 'string' ? JSON.parse(materials) : materials;
      for (let mat of materialsList) {
        await db.execute('INSERT INTO artifactmaterial (artifact_id, material) VALUES (?, ?)', [id, mat]);
      }
    }
    res.json({ message: 'Artifact updated successfully' });
  } catch (error) {
    handleDbError(error, res);
  }
});

// Soft Delete artifact (Admin only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { id } = req.params;
  try {
    await db.execute('UPDATE artifact SET is_deleted = 1 WHERE artifact_id = ?', [id]);
    res.json({ message: 'Artifact deleted successfully (soft delete)' });
  } catch (error) {
    handleDbError(error, res);
  }
});

module.exports = router;