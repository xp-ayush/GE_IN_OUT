const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get driver by mobile number
router.get('/:mobile', async (req, res) => {
  try {
    const [drivers] = await db.execute(
      'SELECT mobile, name FROM drivers WHERE mobile = ?',
      [req.params.mobile]
    );
    
    if (drivers.length > 0) {
      res.json({ driver: drivers[0] });
    } else {
      res.status(404).json({ message: 'Driver not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new driver
router.post('/', async (req, res) => {
  try {
    const { mobile, name } = req.body;
    const [result] = await db.execute(
      'INSERT INTO drivers (mobile, name) VALUES (?, ?)',
      [mobile, name]
    );
    res.status(201).json({ 
      message: 'Driver added successfully',
      driver: { mobile, name }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
