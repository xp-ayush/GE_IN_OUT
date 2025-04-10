const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Check if bill number exists in either inward or outward entries
router.get('/check/:billNumber', async (req, res) => {
  try {
    const [inwardResults] = await db.execute(
      'SELECT id FROM inward_entries WHERE bill_number = ?',
      [req.params.billNumber]
    );

    const [outwardResults] = await db.execute(
      'SELECT id FROM outward_entries WHERE bill_number = ?',
      [req.params.billNumber]
    );

    const exists = inwardResults.length > 0 || outwardResults.length > 0;
    res.json({ exists });
  } catch (error) {
    res.status(500).json({ message: 'Error checking bill number' });
  }
});

module.exports = router;
