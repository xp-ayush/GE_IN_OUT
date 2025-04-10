const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./config/db');

const billValidationRoutes = require('./routes/billValidationRoutes');
const validationRoutes = require('./routes/validationRoutes');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/validation/bill', billValidationRoutes);
app.use('/api/validation', validationRoutes);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

module.exports = app;