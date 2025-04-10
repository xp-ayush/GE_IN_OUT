const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get vehicle by number
router.get('/:number', async (req, res) => {
  try {
    const [vehicles] = await db.execute(
      'SELECT vehicle_number, vehicle_type FROM vehicles WHERE vehicle_number = ?',
      [req.params.number]
    );
    
    if (vehicles.length > 0) {
      res.json({ vehicle: vehicles[0] });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new vehicle
router.post('/', async (req, res) => {
  try {
    const { vehicle_number, vehicle_type } = req.body;
    const [result] = await db.execute(
      'INSERT INTO vehicles (vehicle_number, vehicle_type) VALUES (?, ?)',
      [vehicle_number, vehicle_type]
    );
    res.status(201).json({ 
      message: 'Vehicle added successfully',
      vehicle: { vehicle_number, vehicle_type }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
