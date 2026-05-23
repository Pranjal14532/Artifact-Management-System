const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Get all exhibitions
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT e.*, m.name as museum_name 
      FROM exhibition e
      LEFT JOIN museum m ON e.museum_id = m.museum_id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add exhibition (Admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { name, start_date, end_date, museum_id, artifact_ids } = req.body;

  try {
    const [result] = await db.execute(
      'INSERT INTO exhibition (name, start_date, end_date, museum_id, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, start_date, end_date, museum_id, req.user.id]
    );

    const exhibitionId = result.insertId;

    // Link artifacts
    if (artifact_ids && Array.isArray(artifact_ids)) {
      for (let artId of artifact_ids) {
        await db.execute('INSERT INTO exhibitionartifact (exhibition_id, artifact_id) VALUES (?, ?)', [exhibitionId, artId]);
      }
    }

    res.status(201).json({ message: 'Exhibition added', exhibitionId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete exhibition (Admin only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  const { id } = req.params;
  try {
    await db.execute('DELETE FROM exhibition WHERE exhibition_id = ?', [id]);
    res.json({ message: 'Exhibition deleted successfully' });
  } catch (error) {
    console.error('Error deleting exhibition:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add feedback for exhibition (Authenticated)
router.post('/:id/feedback', auth, async (req, res) => {
  const { id } = req.params;
  const { rating, comments, visited_date } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }
  if (!visited_date) {
    return res.status(400).json({ message: 'Visited date is required' });
  }

  try {
    // Check if exhibition exists
    const [exhibitions] = await db.execute('SELECT * FROM exhibition WHERE exhibition_id = ?', [id]);
    if (exhibitions.length === 0) {
      return res.status(404).json({ message: 'Exhibition not found' });
    }

    await db.execute(
      'INSERT INTO exhibitionfeedback (exhibition_id, user_id, rating, comments, visited_date) VALUES (?, ?, ?, ?, ?)',
      [id, req.user.id, rating, comments || null, visited_date]
    );

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feedback for exhibition (Public)
router.get('/:id/feedback', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(`
      SELECT ef.*, u.name as user_name
      FROM exhibitionfeedback ef
      LEFT JOIN users u ON ef.user_id = u.user_id
      WHERE ef.exhibition_id = ?
      ORDER BY ef.created_at DESC
    `, [id]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;