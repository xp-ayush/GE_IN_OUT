import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './OutwardEntry.css';

const OutwardEntryForm = () => {
  const [formData, setFormData] = useState({
    driver_mobile: '',
    driver_name: '',
    vehicle_number: '',
    vehicle_type: '',
    source: '',
    driver_exists: false,
    vehicle_exists: false,
    time_in: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
  });

  const [serialNumber, setSerialNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const sourceOptions = [
    'Baddi Unit 1',
    'Baddi Unit 2',
    'Baddi Unit 3'
  ];

  useEffect(() => {
    fetchSerialNumber();
  }, []);

  const fetchSerialNumber = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/outward-entries/next-serial`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSerialNumber(response.data.serial_number);
    } catch (err) {
      setError('Error fetching serial number');
    }
  };

  const handleDriverMobileChange = async (e) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, '');
    
    // Don't update if trying to enter non-numeric characters
    if (value === e.target.value) {
      setFormData(prev => ({ ...prev, driver_mobile: value, driver_name: '', driver_exists: false }));

      if (value.length === 10) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `${API_BASE_URL}/api/drivers/${value}`,
            { headers: { Authorization: `Bearer ${token}` }}
          );
          
          if (response.data.driver) {
            setFormData(prev => ({
              ...prev,
              driver_name: response.data.driver.name,
              driver_exists: true
            }));
            setSuccess('Driver details fetched successfully');
            setTimeout(() => setSuccess(''), 3000);
          }
        } catch (err) {
          setFormData(prev => ({
            ...prev,
            driver_name: '',
            driver_exists: false
          }));
          setError('Driver not found. Please enter driver details.');
          setTimeout(() => setError(''), 3000);
        }
      }
    }
  };

  const handleDriverNameChange = async (e) => {
    const name = e.target.value;
    setFormData(prev => ({ ...prev, driver_name: name }));
  };

  const handleVehicleNumberChange = async (e) => {
    const number = e.target.value.toUpperCase(); // Convert to uppercase
    setFormData(prev => ({ ...prev, vehicle_number: number, vehicle_type: '', vehicle_exists: false }));

    if (number.length >= 6) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/api/vehicles/${number}`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        if (response.data.vehicle) {
          setFormData(prev => ({
            ...prev,
            vehicle_type: response.data.vehicle.vehicle_type,
            vehicle_exists: true
          }));
          setSuccess('Vehicle details fetched successfully');
          setTimeout(() => setSuccess(''), 3000);
        }
      } catch (err) {
        setFormData(prev => ({
          ...prev,
          vehicle_type: '',
          vehicle_exists: false
        }));
        setError('Vehicle not found. Please enter vehicle details.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const currentDate = new Date();
      
      // Convert time_in to UTC
      const [hours, minutes] = formData.time_in.split(':');
      const timeInUTC = new Date(currentDate);
      timeInUTC.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // If this is a new driver, create driver record first
      if (formData.driver_mobile && formData.driver_name && !formData.driver_exists) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/drivers`,
            {
              mobile: formData.driver_mobile,
              name: formData.driver_name
            },
            { headers: { Authorization: `Bearer ${token}` }}
          );
        } catch (err) {
          console.log('Error creating driver:', err);
        }
      }

      // If this is a new vehicle, create vehicle record first
      if (formData.vehicle_number && formData.vehicle_type && !formData.vehicle_exists) {
        try {
          await axios.post(
            `${API_BASE_URL}/api/vehicles`,
            {
              vehicle_number: formData.vehicle_number,
              vehicle_type: formData.vehicle_type
            },
            { headers: { Authorization: `Bearer ${token}` }}
          );
        } catch (err) {
          console.log('Error creating vehicle:', err);
        }
      }

      // Continue with existing submit logic
      await axios.post(
        `${API_BASE_URL}/api/outward-entries`,
        { 
          ...formData,
          time_in: timeInUTC.toISOString().slice(11, 16), // Extract HH:mm in UTC
          serial_number: serialNumber,
          entry_date: new Date().toISOString().split('T')[0]
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      setSuccess('Entry created successfully!');
      setFormData({
        driver_mobile: '',
        driver_name: '',
        vehicle_number: '',
        vehicle_type: '',
        source: '',
        driver_exists: false,
        vehicle_exists: false,
        time_in: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)
      });
      setError('');
      fetchSerialNumber();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="outward-entry-form">
      <h2>New Outward Entry</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Serial Number</label>
            <input
              type="text"
              value={serialNumber}
              disabled
              className="readonly-input"
            />
          </div>
          <div className="form-group">
            <label>Driver Mobile</label>
            <input
              type="tel"
              name="driver_mobile"
              value={formData.driver_mobile}
              onChange={handleDriverMobileChange}
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              pattern="[0-9]{10}"
              maxLength="10"
              placeholder="Enter 10 digit mobile"
              required
            />
          </div>
          <div className="form-group">
            <label>Driver Name</label>
            <input
              type="text"
              name="driver_name"
              value={formData.driver_name}
              onChange={handleDriverNameChange}
              placeholder={formData.driver_mobile.length === 10 ? "Enter new driver name" : "Auto-filled from database"}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Vehicle Number</label>
            <input
              type="text"
              name="vehicle_number"
              value={formData.vehicle_number}
              onChange={handleVehicleNumberChange}
              placeholder="Enter vehicle number"
              required
            />
          </div>
          <div className="form-group">
            <label>Vehicle Type</label>
            <input
              type="text"
              name="vehicle_type"
              value={formData.vehicle_type}
              onChange={handleChange}
              placeholder={formData.vehicle_number ? "Enter vehicle type" : "Auto-filled from database"}
              required
            />
          </div>
          <div className="form-group">
            <label>Source</label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              required
            >
              <option value="">Select Source</option>
              {sourceOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="button-group">
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OutwardEntryForm;
