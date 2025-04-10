const db = require('../config/db');
const { generateSerialNumber } = require('../utils/serialNumberGenerator');

// Get next serial number
const getNextSerialNumber = async (req, res) => {
  try {
    const serial_number = await generateSerialNumber('outward');
    res.json({ serial_number });
  } catch (error) {
    console.error('Error generating serial number:', error);
    res.status(500).json({ message: 'Error generating serial number' });
  }
};

// Create a new outward entry
const createOutwardEntry = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      driver_mobile,
      driver_name,
      vehicle_number,
      vehicle_type,
      source
    } = req.body;

    // First, ensure driver exists
    const [existingDriver] = await connection.execute(
      'SELECT mobile FROM drivers WHERE mobile = ?',
      [driver_mobile]
    );

    if (existingDriver.length === 0) {
      // Driver doesn't exist, create new driver
      await connection.execute(
        'INSERT INTO drivers (mobile, name) VALUES (?, ?)',
        [driver_mobile, driver_name]
      );
    }

    // Next, ensure vehicle exists
    const [existingVehicle] = await connection.execute(
      'SELECT vehicle_number FROM vehicles WHERE vehicle_number = ?',
      [vehicle_number]
    );

    if (existingVehicle.length === 0) {
      // Vehicle doesn't exist, create new vehicle
      await connection.execute(
        'INSERT INTO vehicles (vehicle_number, vehicle_type) VALUES (?, ?)',
        [vehicle_number, vehicle_type]
      );
    }

    // Generate serial number using the utility
    const serial_number = await generateSerialNumber('outward');

    // Insert the entry with only the required fields
    const [result] = await connection.execute(
      `INSERT INTO outward_entries (
        serial_number, entry_date, time_in,
        driver_mobile, driver_name,
        vehicle_number, vehicle_type,
        source, created_by
      ) VALUES (?, CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?)`,
      [
        serial_number,
        driver_mobile,
        driver_name,
        vehicle_number,
        vehicle_type,
        source,
        req.user.id
      ]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Outward entry created successfully',
      id: result.insertId,
      serial_number
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating outward entry:', error);
    res.status(500).json({ message: 'Error creating outward entry', error: error.message });
  } finally {
    connection.release();
  }
};

// Get driver info
const getDriverInfo = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM drivers WHERE mobile = ?',
      [req.params.mobile]
    );

    if (rows.length === 0) {
      return res.json({ driver: null });
    }

    res.json({ driver: rows[0] });
  } catch (error) {
    console.error('Error fetching driver info:', error);
    res.status(500).json({ message: 'Error fetching driver info' });
  }
};

// Get vehicle info
const getVehicleInfo = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM vehicles WHERE vehicle_number = ?',
      [req.params.number]
    );

    if (rows.length === 0) {
      return res.json({ vehicle: null });
    }

    res.json({ vehicle: rows[0] });
  } catch (error) {
    console.error('Error fetching vehicle info:', error);
    res.status(500).json({ message: 'Error fetching vehicle info' });
  }
};

// Get all outward entries for a user
const getUserOutwardEntries = async (req, res) => {
  const connection = await db.getConnection();
  try {
    let query = `SELECT e.*, 
      COALESCE(
        CONCAT('[', 
          GROUP_CONCAT(
            JSON_OBJECT(
              'id', m.id,
              'name', m.material_name,
              'quantity', m.quantity,
              'uom', m.uom
            )
          ),
        ']'),
        '[]'
      ) as materials_list
      FROM outward_entries e
      LEFT JOIN outward_materials m ON e.id = m.outward_entry_id`;

    let params = [];

    // If user is not a viewer, only show their entries
    if (req.user.role !== 'Viewer') {
      query += ` WHERE e.created_by = ?`;
      params = [req.user.id];
    }

    query += ` GROUP BY e.id ORDER BY e.entry_date DESC, e.time_in DESC`;

    const [entries] = await connection.execute(query, params);

    // Parse materials_list for each entry
    const processedEntries = entries.map(entry => ({
      ...entry,
      materials_list: entry.materials_list
        ? JSON.parse(entry.materials_list)
        : []
    }));

    res.json(processedEntries);
  } catch (error) {
    console.error('Error fetching outward entries:', error);
    res.status(500).json({ message: 'Error fetching outward entries' });
  } finally {
    connection.release();
  }
};

const updateOutwardEntry = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const entryId = req.params.id;
    const {
      purpose,
      check_by,
      party_name,
      bill_number,
      bill_amount,
      remarks,
      materials,
      time_out
    } = req.body;

    // First get the existing entry
    const [existingEntries] = await connection.execute(
      `SELECT * FROM outward_entries 
       WHERE id = ? AND created_by = ?`,
      [entryId, req.user.id]
    );

    if (existingEntries.length === 0) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Update the main entry fields
    const updateFields = [];
    const updateValues = [];

    if (purpose) {
      updateFields.push('purpose = ?');
      updateValues.push(purpose);
    }
    if (check_by) {
      updateFields.push('check_by = ?');
      updateValues.push(check_by);
    }
    if (party_name) {
      updateFields.push('party_name = ?');
      updateValues.push(party_name);
    }
    if (bill_number) {
      updateFields.push('bill_number = ?');
      updateValues.push(bill_number);
    }
    if (bill_amount) {
      updateFields.push('bill_amount = ?');
      updateValues.push(bill_amount);
    }
    if (remarks) {
      updateFields.push('remarks = ?');
      updateValues.push(remarks);
    }
    if (time_out) {
      updateFields.push('time_out = ?');
      updateValues.push(time_out);
    }

    // Update the entry if there are fields to update
    if (updateFields.length > 0) {
      updateValues.push(entryId);
      updateValues.push(req.user.id);
      await connection.execute(
        `UPDATE outward_entries 
         SET ${updateFields.join(', ')} 
         WHERE id = ? AND created_by = ?`,
        updateValues
      );
    }

    // Handle materials if they are provided
    if (materials && Array.isArray(materials)) {
      // Validate materials
      const invalidMaterials = materials.filter(m => !m.name || !m.quantity || !m.uom);
      if (invalidMaterials.length > 0) {
        throw new Error('All materials must have name, quantity, and UoM');
      }

      // Delete existing materials
      await connection.execute(
        'DELETE FROM outward_materials WHERE outward_entry_id = ?',
        [entryId]
      );

      // Insert new materials
      for (const material of materials) {
        await connection.execute(
          `INSERT INTO outward_materials (
            outward_entry_id, material_name, quantity, uom
          ) VALUES (?, ?, ?, ?)`,
          [entryId, material.name, material.quantity, material.uom]
        );
      }
    }

    // Get the updated entry with materials
    const [updatedEntries] = await connection.execute(
      `SELECT e.*, 
        COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', m.id,
              'name', m.material_name,
              'quantity', m.quantity,
              'uom', m.uom
            )
          ),
          JSON_ARRAY()
        ) as materials_list
       FROM outward_entries e
       LEFT JOIN outward_materials m ON e.id = m.outward_entry_id
       WHERE e.id = ?
       GROUP BY e.id`,
      [entryId]
    );

    await connection.commit();

    res.json({
      message: 'Outward entry updated successfully',
      entry: updatedEntries[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating outward entry:', error);
    res.status(500).json({ 
      message: 'Error updating outward entry',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getNextSerialNumber,
  createOutwardEntry,
  getDriverInfo,
  getVehicleInfo,
  getUserOutwardEntries,
  updateOutwardEntry
};
