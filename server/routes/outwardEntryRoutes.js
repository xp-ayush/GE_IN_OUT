const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getNextSerialNumber,
  createOutwardEntry,
  getDriverInfo,
  getVehicleInfo,
  getUserOutwardEntries,
  updateOutwardEntry
} = require('../controllers/outwardEntryController');

// Protect all routes
router.use(authenticateToken);

// Get next serial number
router.get('/next-serial', getNextSerialNumber);

// Create a new outward entry
router.post('/', createOutwardEntry);

// Get driver info
router.get('/drivers/:mobile', getDriverInfo);

// Get vehicle info
router.get('/vehicles/:number', getVehicleInfo);

// Get all outward entries for the logged-in user
router.get('/', getUserOutwardEntries);

// Update an outward entry
router.put('/:id', updateOutwardEntry);

module.exports = router;
