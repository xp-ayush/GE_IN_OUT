const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/check-bill/:billNumber', async (req, res) => {
    try {
        const billNumber = decodeURIComponent(req.params.billNumber);
        const [inwardResults] = await db.execute(
            'SELECT id FROM inward_entries WHERE bill_number = ?',
            [billNumber]
        );

        const [outwardResults] = await db.execute(
            'SELECT id FROM outward_entries WHERE bill_number = ?',
            [billNumber]
        );

        const exists = inwardResults.length > 0 || outwardResults.length > 0;
        res.json({ exists, message: exists ? 'Bill number already exists' : 'Bill number is available' });
    } catch (error) {
        console.error('Error checking bill number:', error);
        res.status(500).json({ message: 'Error checking bill number' });
    }
});

module.exports = router;
