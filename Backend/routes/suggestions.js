const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Get all suggestions (Admin only)
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }

    try {
        const [rows] = await db.execute(`
            SELECT s.*, u.name as suggested_by_name, m.name as museum_name
            FROM suggestions s
            LEFT JOIN users u ON s.suggested_by = u.user_id
            LEFT JOIN museum m ON s.museum_id = m.museum_id
            ORDER BY s.created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Submit a suggestion (Authenticated users)
router.post('/', auth, async (req, res) => {
    const { type, title, description, museum_id } = req.body;

    if (!type || !title) {
        return res.status(400).json({ message: 'Type and title are required.' });
    }

    try {
        await db.execute(
            'INSERT INTO suggestions (type, title, description, museum_id, suggested_by) VALUES (?, ?, ?, ?, ?)',
            [type, title, description, museum_id || null, req.user.id]
        );
        res.status(201).json({ message: 'Suggestion submitted successfully. It will be reviewed by an admin.' });
    } catch (error) {
        console.error('Error submitting suggestion:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update suggestion status (Admin only)
router.put('/:id/status', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
        const [result] = await db.execute(
            'UPDATE suggestions SET status = ? WHERE suggestion_id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Suggestion not found.' });
        }

        res.json({ message: `Suggestion marked as ${status}.` });
    } catch (error) {
        console.error('Error updating suggestion status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
