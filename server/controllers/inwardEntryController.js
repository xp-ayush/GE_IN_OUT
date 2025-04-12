const db = require('../config/db');
const { generateSerialNumber } = require('../utils/serialNumberGenerator');

// Get next serial number
const getNextSerialNumber = async (req, res) => {
  try {
    const serial_number = await generateSerialNumber();
    res.json({ serial_number });
  } catch (error) {
    console.error('Error generating serial number:', error);
    res.status(500).json({ message: 'Error generating serial number' });
  }
};

// Create a new inward entry
const createInwardEntry = async (req, res) => {
  const connection = await db.getConnection();
  try {
    // Check for duplicate bill number
    const [existingBills] = await connection.execute(
      'SELECT id FROM inward_entries WHERE bill_number = ? UNION SELECT id FROM outward_entries WHERE bill_number = ?',
      [req.body.bill_number, req.body.bill_number]
    );

    if (existingBills.length > 0) {
      return res.status(400).json({ message: 'Bill number already exists' });
    }

    await connection.beginTransaction();

    const {
      serial_number,
      entry_date,
      party_name,
      bill_number,
      bill_amount,
      entry_type,
      materials,
      vehicle_type,
      source_location,
      time_in,
      remarks
    } = req.body;

    // Convert time_in to IST if needed
    const timeInIST = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });

    // Insert the main entry with IST time
    const [result] = await connection.execute(
      `INSERT INTO inward_entries (
        serial_number, entry_date, party_name, bill_number, bill_amount,
        entry_type, vehicle_type, source_location, time_in, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        serial_number, entry_date, party_name, bill_number, bill_amount,
        entry_type, vehicle_type, source_location, timeInIST, remarks, req.user.id
      ]
    );

    const entryId = result.insertId;

    // Insert all materials
    if (materials && Array.isArray(materials) && materials.length > 0) {
      const materialValues = materials.map(material => [
        entryId,
        material.name,
        material.quantity,
        material.uom
      ]);

      await connection.query(
        `INSERT INTO inward_materials (inward_entry_id, material_name, quantity, uom) VALUES ?`,
        [materialValues]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Inward entry created successfully', id: entryId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating inward entry:', error);
    res.status(500).json({ message: 'Error creating inward entry' });
  } finally {
    connection.release();
  }
};

// Get all inward entries for a user
const getUserInwardEntries = async (req, res) => {
  const connection = await db.getConnection();
  try {
    let query = `SELECT * FROM inward_entries ORDER BY entry_date DESC, time_in DESC`;
    let params = [];

    // If user is not a viewer, only show their entries
    if (req.user.role !== 'Viewer') {
      query = `SELECT * FROM inward_entries 
               WHERE created_by = ?
               ORDER BY entry_date DESC, time_in DESC`;
      params = [req.user.id];
    }

    // First get all inward entries
    const [entries] = await connection.execute(query, params);

    // Then get materials for all these entries
    if (entries.length > 0) {
      const entryIds = entries.map(e => e.id);
      const [materials] = await connection.execute(
        `SELECT * FROM inward_materials 
         WHERE inward_entry_id IN (${entryIds.map(() => '?').join(',')})`,
        entryIds
      );

      // Group materials by entry_id
      const materialsByEntry = materials.reduce((acc, mat) => {
        if (!acc[mat.inward_entry_id]) {
          acc[mat.inward_entry_id] = [];
        }
        acc[mat.inward_entry_id].push({
          id: mat.id,
          name: mat.material_name,
          quantity: mat.quantity,
          uom: mat.uom
        });
        return acc;
      }, {});

      // Add materials to their respective entries
      const processedEntries = entries.map(entry => ({
        ...entry,
        materials_list: materialsByEntry[entry.id] || []
      }));

      res.json(processedEntries);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching inward entries:', error);
    res.status(500).json({ message: 'Error fetching inward entries' });
  } finally {
    connection.release();
  }
};

// Get a single inward entry
const getInwardEntry = async (req, res) => {
  const connection = await db.getConnection();
  try {
    // Get the main entry
    const [entries] = await connection.execute(
      'SELECT * FROM inward_entries WHERE id = ?',
      [req.params.id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    const entry = entries[0];

    // Check if user has access to this entry
    if (req.user.role !== 'Viewer' && entry.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get the materials for this entry
    const [materials] = await connection.execute(
      'SELECT * FROM inward_materials WHERE inward_entry_id = ?',
      [entry.id]
    );

    // Format materials
    const materials_list = materials.map(mat => ({
      id: mat.id,
      name: mat.material_name,
      quantity: mat.quantity,
      uom: mat.uom
    }));

    // Add materials to entry
    const processedEntry = {
      ...entry,
      materials_list
    };

    res.json(processedEntry);
  } catch (error) {
    console.error('Error fetching inward entry:', error);
    res.status(500).json({ message: 'Error fetching inward entry' });
  } finally {
    connection.release();
  }
};

// Update timeout for an entry
const updateTimeout = async (req, res) => {
  const connection = await db.getConnection();
  try {
    // Get current time in IST
    const timeOutIST = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
    
    // Update with IST time
    const [result] = await connection.execute(
      'UPDATE inward_entries SET time_out = ? WHERE id = ?',
      [timeOutIST, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json({ message: 'Timeout updated successfully' });
  } catch (error) {
    console.error('Error updating timeout:', error);
    res.status(500).json({ message: 'Error updating timeout' });
  } finally {
    connection.release();
  }
};

module.exports = {
  createInwardEntry,
  getUserInwardEntries,
  getInwardEntry,
  updateTimeout,
  getNextSerialNumber
};
