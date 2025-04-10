const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createInwardEntry,
  getUserInwardEntries,
  getInwardEntry,
  updateTimeout,
  getNextSerialNumber
} = require('../controllers/inwardEntryController');

// Protect all routes
router.use(authenticateToken);

// Get next serial number
router.get('/next-serial', getNextSerialNumber);

// Create a new inward entry
router.post('/', createInwardEntry);

// Get all inward entries for the logged-in user
router.get('/', getUserInwardEntries);

// Get a specific inward entry
router.get('/:id', getInwardEntry);

// Update timeout for an entry
router.patch('/:id/timeout', updateTimeout);

module.exports = router;
