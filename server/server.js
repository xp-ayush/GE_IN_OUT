require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/db');
const inwardEntryRoutes = require('./routes/inwardEntryRoutes');
const outwardEntryRoutes = require('./routes/outwardEntryRoutes');
const driverRoutes = require('./routes/driverRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Add this helper function at the top with other imports
function convertToUTCTime(timeString) {
  const now = new Date();
  const [hours, minutes] = timeString.split(':');
  const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes));
  return localDate.toISOString().slice(11, 16);
}

// Initialize database function
async function initializeDatabase() {
  try {
    // Create users table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('User', 'Admin', 'Viewer') NOT NULL DEFAULT 'User',
        last_login TIMESTAMP NULL,
        created_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        location VARCHAR(255),
        is_disabled BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Check if admin user exists
    const [users] = await db.execute('SELECT * FROM users WHERE role = "Admin"');
    if (users.length === 0) {
      // Create default admin user if none exists
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin User', 'admin@example.com', hashedPassword, 'Admin']
      );
      console.log('Default admin user created');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on startup
initializeDatabase();

app.use(cors());
app.use(express.json());

// Debug endpoint to check table structure
app.get('/api/debug/table-info', async (req, res) => {
  try {
    const [rows] = await db.execute('DESCRIBE users');
    res.json(rows);
  } catch (error) {
    console.error('Table check error:', error);
    res.status(500).json({ message: 'Error checking table structure', error: error.message });
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.is_disabled) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    // Update last login
    await db.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add user endpoint (Admin only)
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      console.log('Non-admin attempted to create user:', req.user.role);
      return res.status(403).json({ message: 'Only admins can create users' });
    }

    const { name, email, password, role, location } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      console.log('Missing required fields:', { name, email, role });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role, location, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, location, req.user.id]
    );

    console.log('User created successfully:', { userId: result.insertId });
    res.status(201).json({ 
      message: 'User created successfully',
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get all users (Admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can view user list' });
    }

    // Get all users except their passwords
    const [users] = await db.execute(
      'SELECT id, name, email, role, location, last_login, updated_at, is_disabled FROM users ORDER BY id DESC'
    );

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Disable/Enable user (Admin only)
app.patch('/api/users/:id/toggle-status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can modify users' });
    }

    const [user] = await db.execute('SELECT is_disabled FROM users WHERE id = ?', [req.params.id]);
    if (!user.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newStatus = !user[0].is_disabled;
    await db.execute('UPDATE users SET is_disabled = ? WHERE id = ?', [newStatus, req.params.id]);
    
    res.json({ message: `User ${newStatus ? 'disabled' : 'enabled'} successfully` });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change user password (Admin only)
app.patch('/api/users/:id/change-password', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can change passwords' });
    }

    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected route example
app.get('/api/user-profile', authenticateToken, async (req, res) => {
  try {
    const [user] = await db.execute(
      'SELECT id, name, email, role, last_login, location FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json(user[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all inward entries
app.get('/api/inward-entries', authenticateToken, async (req, res) => {
  try {
    let query;
    let queryParams = [];

    if (req.user.role === 'User') {
      // Users can only see their own entries
      query = `
        SELECT i.*, 
               TIME_FORMAT(i.time_in, '%H:%i') as time_in,
               TIME_FORMAT(i.time_out, '%H:%i') as time_out,
               u.name as created_by_name
        FROM inward_entries i 
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.created_by = ?
        ORDER BY i.created_at DESC
      `;
      queryParams = [req.user.id];
    } else {
      // Admin and Viewer can see all entries with creator name
      query = `
        SELECT i.*, 
               TIME_FORMAT(i.time_in, '%H:%i') as time_in,
               TIME_FORMAT(i.time_out, '%H:%i') as time_out,
               u.name as created_by_name
        FROM inward_entries i 
        LEFT JOIN users u ON i.created_by = u.id
        ORDER BY i.created_at DESC
      `;
    }

    const [entries] = await db.execute(query, queryParams);

    // Get materials for each entry
    const entriesWithMaterials = await Promise.all(entries.map(async (entry) => {
      const [materials] = await db.execute(`
        SELECT material_name as name, quantity, uom
        FROM inward_materials
        WHERE inward_entry_id = ?
      `, [entry.id]);
      
      return {
        ...entry,
        materials_list: materials
      };
    }));

    res.json(entriesWithMaterials);
  } catch (error) {
    console.error('Error fetching inward entries:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get all outward entries
app.get('/api/outward-entries', authenticateToken, async (req, res) => {
  try {
    let query;
    let queryParams = [];

    if (req.user.role === 'User') {
      // Users can only see their own entries
      query = `
        SELECT o.*, u.name as created_by_name
        FROM outward_entries o
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.created_by = ?
        ORDER BY o.created_at DESC
      `;
      queryParams = [req.user.id];
    } else {
      // Admin and Viewer can see all entries with creator name
      query = `
        SELECT o.*, u.name as created_by_name
        FROM outward_entries o
        LEFT JOIN users u ON o.created_by = u.id
        ORDER BY o.created_at DESC
      `;
    }

    const [entries] = await db.execute(query, queryParams);

    // Get materials for each entry
    const entriesWithMaterials = await Promise.all(entries.map(async (entry) => {
      const [materials] = await db.execute(`
        SELECT material_name as name, quantity, uom
        FROM outward_materials
        WHERE outward_entry_id = ?
      `, [entry.id]);
      
      return {
        ...entry,
        materials_list: materials
      };
    }));

    res.json(entriesWithMaterials);
  } catch (error) {
    console.error('Error fetching outward entries:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get all inward entries (Admin only)
app.get('/api/admin/inward-entries', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can view all entries' });
    }

    const [entries] = await db.execute(`
      SELECT 
        i.*,
        u.name as created_by_name,
        GROUP_CONCAT(
          CONCAT(
            im.material_name, ' - ',
            im.quantity, ' ',
            im.uom
          ) SEPARATOR ', '
        ) as materials_info
      FROM inward_entries i 
      LEFT JOIN users u ON i.created_by = u.id 
      LEFT JOIN inward_materials im ON i.id = im.inward_entry_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);

    // Format the entries
    const formattedEntries = entries.map(entry => ({
      ...entry,
      materials: entry.materials_info ? entry.materials_info.split(', ').map(item => {
        const [material, details] = item.split(' - ');
        const [quantity, uom] = details.split(' ');
        return {
          material_name: material,
          quantity,
          uom
        };
      }) : []
    }));

    res.json(formattedEntries);
  } catch (error) {
    console.error('Error fetching inward entries:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Get all outward entries (Admin only)
app.get('/api/admin/outward-entries', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can view all entries' });
    }

    const [entries] = await db.execute(`
      SELECT 
        o.*,
        u.name as created_by_name,
        GROUP_CONCAT(
          CONCAT(
            om.material_name, ' - ',
            om.quantity, ' ',
            om.uom
          ) SEPARATOR ', '
        ) as materials_info
      FROM outward_entries o
      LEFT JOIN users u ON o.created_by = u.id 
      LEFT JOIN outward_materials om ON o.id = om.outward_entry_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

    // Format the entries
    const formattedEntries = entries.map(entry => ({
      ...entry,
      materials: entry.materials_info ? entry.materials_info.split(', ').map(item => {
        const [material, details] = item.split(' - ');
        const [quantity, uom] = details.split(' ');
        return {
          material_name: material,
          quantity,
          uom
        };
      }) : []
    }));

    res.json(formattedEntries);
  } catch (error) {
    console.error('Error fetching outward entries:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Export inward entries
app.get('/api/export/inward-entries', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = `SELECT ie.* FROM inward_entries ie`;
    const queryParams = [];

    if (req.user.role === 'User') {
      query += ` WHERE ie.created_by = ?`;
      queryParams.push(req.user.id);
      
      if (date) {
        query += ` AND DATE(ie.entry_date) = ?`;
        queryParams.push(date);
      }
    }

    query += ` ORDER BY ie.entry_date ASC, ie.id ASC`;
    
    const [entries] = await db.execute(query, queryParams);

    // Format data without created_by field
    const formattedData = await Promise.all(entries.map(async (entry) => {
      const [materials] = await db.execute(`
        SELECT material_name, quantity, uom
        FROM inward_materials
        WHERE inward_entry_id = ?
      `, [entry.id]);

      const materialsString = materials.map(m => 
        `${m.material_name} (${m.quantity} ${m.uom})`
      ).join('\n');

      return {
        'Serial Number': entry.serial_number || '',
        'Date': entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : '',
        'Party Name': entry.party_name || '',
        'Location': entry.source_location || '',
        'Bill Number': entry.bill_number || '',
        'Bill Amount': entry.bill_amount || '',
        'Entry Type': entry.entry_type || '',
        'Vehicle Type': entry.vehicle_type || '',
        'Time In': entry.time_in || '',
        'Time Out': entry.time_out || '',
        'Materials': materialsString || '',
        'Remarks': entry.remarks || '',
        'Status': entry.time_out ? 'Completed' : 'Pending'
      };
    }));

    res.json({ data: formattedData });
  } catch (error) {
    console.error('Error in export inward:', error);
    res.status(500).json({ 
      message: 'Error exporting data', 
      error: error.message 
    });
  }
});

// Export outward entries
app.get('/api/export/outward-entries', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = `SELECT oe.* FROM outward_entries oe`;
    const queryParams = [];

    if (req.user.role === 'User') {
      query += ` WHERE oe.created_by = ?`;
      queryParams.push(req.user.id);
      
      if (date) {
        query += ` AND DATE(oe.entry_date) = ?`;
        queryParams.push(date);
      }
    }

    query += ` ORDER BY oe.entry_date ASC, oe.id ASC`;
    
    const [entries] = await db.execute(query, queryParams);

    // Format data without created_by field
    const formattedData = await Promise.all(entries.map(async (entry) => {
      const [materials] = await db.execute(`
        SELECT material_name, quantity, uom
        FROM outward_materials
        WHERE outward_entry_id = ?
      `, [entry.id]);

      const materialsString = materials.map(m => 
        `${m.material_name} (${m.quantity} ${m.uom})`
      ).join('\n');

      return {
        'Serial Number': entry.serial_number || '',
        'Date': entry.entry_date ? new Date(entry.entry_date).toLocaleDateString() : '',
        'Party Name': entry.party_name || '',
        'Source': entry.source || '',
        'Purpose': entry.purpose || '',
        'Driver Name': entry.driver_name || '',
        'Driver Mobile': entry.driver_mobile || '',
        'Vehicle Number': entry.vehicle_number || '',
        'Vehicle Type': entry.vehicle_type || '',
        'Bill Number': entry.bill_number || '',
        'Bill Amount': entry.bill_amount || '',
        'Time In': entry.time_in || '',
        'Time Out': entry.time_out || '',
        'Materials': materialsString || '',
        'Remarks': entry.remarks || '',
        'Status': entry.time_out ? 'Completed' : 'Pending'
      };
    }));

    res.json({ data: formattedData });
  } catch (error) {
    console.error('Error in export outward:', error);
    res.status(500).json({ 
      message: 'Error exporting data', 
      error: error.message 
    });
  }
});

// Add inward entry routes
app.use('/api/inward-entries', inwardEntryRoutes);

// Add outward entry routes
app.use('/api/outward-entries', outwardEntryRoutes);

// Add driver routes
app.use('/api/drivers', authenticateToken, driverRoutes);

// Add vehicle routes
app.use('/api/vehicles', authenticateToken, vehicleRoutes);

// Update all timeout endpoint handlers to use UTC conversion
app.patch('/api/inward-entries/:id/timeout', authenticateToken, async (req, res) => {
  try {
    const { time_out } = req.body;
    const utcTime = convertToUTCTime(time_out);
    await db.execute(
      'UPDATE inward_entries SET time_out = ? WHERE id = ?',
      [utcTime, req.params.id]
    );
    res.json({ message: 'Time out updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating time out' });
  }
});

app.patch('/api/outward-entries/:id/timeout', authenticateToken, async (req, res) => {
  try {
    const { time_out } = req.body;
    const utcTime = convertToUTCTime(time_out);
    await db.execute(
      'UPDATE outward_entries SET time_out = ? WHERE id = ?',
      [utcTime, req.params.id]
    );
    res.json({ message: 'Time out updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating time out' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
