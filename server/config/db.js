const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'seddb.cwqqlkcrophs.ap-south-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'Sedl12345',
  database: process.env.DB_NAME || 'gateentry',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
