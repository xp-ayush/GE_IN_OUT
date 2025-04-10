const db = require('../config/db');

const generateSerialNumber = async (type = 'inward') => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
    
    // Determine financial year
    let startYear = currentDate.getFullYear();
    if (currentMonth < 4) { // If current month is before April, financial year started in previous year
      startYear -= 1;
    }
    const endYear = startYear + 1;
    const financialYear = `${startYear}-${endYear.toString().slice(2)}`;

    // Set prefix based on type
    const prefix = type.toLowerCase() === 'outward' ? 'GE-OUT' : 'GE-IN';
    const table = type.toLowerCase() === 'outward' ? 'outward_entries' : 'inward_entries';

    // Get the latest serial number for the current financial year
    const [rows] = await db.execute(
      `SELECT serial_number FROM ${table} WHERE serial_number LIKE ? ORDER BY id DESC LIMIT 1`,
      [`${prefix}/${financialYear}%`]
    );

    let nextNumber = 1;
    if (rows && rows.length > 0) {
      // Extract the number from the last serial number and increment it
      const lastNumber = parseInt(rows[0].serial_number.split('/').pop());
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format the serial number
    const serialNumber = `${prefix}/${financialYear}/${nextNumber.toString().padStart(5, '0')}`;
    return serialNumber;
  } catch (error) {
    console.error('Error generating serial number:', error);
    // Return a fallback serial number in case of error
    const prefix = type.toLowerCase() === 'outward' ? 'GE-OUT' : 'GE-IN';
    return `${prefix}/${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}/00001`;
  }
};

module.exports = { generateSerialNumber };
