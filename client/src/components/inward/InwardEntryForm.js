import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './InwardEntry.css';

const InwardEntryForm = ({ onEntryCreated }) => {
  const initialMaterial = { name: '', quantity: '', uom: '' };
  const [serialNumber, setSerialNumber] = useState('');
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    party_name: '',
    bill_number: '',
    bill_amount: '',
    entry_type: '',
    vehicle_type: '',
    source_location: '',
    time_in: new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5),
    remarks: ''
  });
  const [materials, setMaterials] = useState([initialMaterial]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch next serial number when component mounts
    const fetchSerialNumber = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/api/inward-entries/next-serial`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setSerialNumber(response.data.serial_number);
      } catch (err) {
        setError('Error fetching serial number');
      }
    };

    fetchSerialNumber();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check bill number uniqueness when it changes
    if (name === 'bill_number' && value) {
      checkBillNumber(value);
    }
  };

  const checkBillNumber = async (billNumber) => {
    try {
      const token = localStorage.getItem('token');
      const encodedBillNumber = encodeURIComponent(billNumber);
      const response = await axios.get(
        `${API_BASE_URL}/api/validation/check-bill/${encodedBillNumber}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.exists) {
        setError('This bill number already exists');
        return false;
      }
      setError('');
      return true;
    } catch (err) {
      console.error('Error checking bill number:', err);
      return true; // Allow submission if validation check fails
    }
  };

  const handleMaterialChange = (index, field, value) => {
    setMaterials(prevMaterials => {
      const newMaterials = [...prevMaterials];
      newMaterials[index] = {
        ...newMaterials[index],
        [field]: value
      };
      return newMaterials;
    });
  };

  const addMaterial = () => {
    setMaterials(prev => [...prev, { ...initialMaterial }]);
  };

  const removeMaterial = (index) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Check bill number before submission
    if (formData.bill_number && !(await checkBillNumber(formData.bill_number))) {
      setLoading(false);
      return;
    }

    // Validate materials
    if (materials.some(m => !m.name || !m.quantity || !m.uom)) {
      setError('All material fields are required');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const currentDate = new Date();
      
      // Convert time_in to UTC
      const [hours, minutes] = formData.time_in.split(':');
      const timeInUTC = new Date(currentDate);
      timeInUTC.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await axios.post(
        `${API_BASE_URL}/api/inward-entries`,
        { 
          ...formData, 
          materials,
          serial_number: serialNumber,
          time_in: timeInUTC.toISOString().slice(11, 16) // Extract HH:mm in UTC
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      setSuccess('Entry created successfully!');
      setMaterials([initialMaterial]);
      
      // Reset only certain fields, keep date and time
      setFormData(prev => ({
        ...prev,
        party_name: '',
        bill_number: '',
        bill_amount: '',
        entry_type: '',
        vehicle_type: '',
        source_location: '',
        remarks: ''
      }));

      // Get new serial number for next entry
      const serialResponse = await axios.get(
        `${API_BASE_URL}/api/inward-entries/next-serial`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSerialNumber(serialResponse.data.serial_number);

      if (onEntryCreated) onEntryCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating entry');
    } finally {
      setLoading(false);
    }
  };

  const uomOptions = [
    'SqY', 'Sq.Ft', 'SqM', 'Cum', 'FTS', 'Kg', 
    'LTR', 'Mtr', 'Nos', 'PRS', 'SET'
  ];

  return (
    <div className="inward-entry-form">
      <h2>New Inward Entry</h2>
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
            <label>Entry Date</label>
            <input
              type="date"
              name="entry_date"
              value={formData.entry_date}
              disabled
              className="readonly-input"
            />
          </div>
          <div className="form-group">
            <label>Time In</label>
            <input
              type="time"
              name="time_in"
              value={formData.time_in}
              disabled
              className="readonly-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Party Name</label>
            <input
              type="text"
              name="party_name"
              value={formData.party_name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Bill Number</label>
            <input
              type="text"
              name="bill_number"
              value={formData.bill_number}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Bill Amount</label>
            <input
              type="number"
              name="bill_amount"
              value={formData.bill_amount}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Entry Type</label>
            <select
              name="entry_type"
              value={formData.entry_type}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Type</option>
              <option value="Cash">Cash</option>
              <option value="Challan">Challan</option>
              <option value="Bill">Bill</option>
              <option value="RGP">RGP</option>
            </select>
          </div>
          <div className="form-group">
            <label>Vehicle Type</label>
            <input
              type="text"
              name="vehicle_type"
              value={formData.vehicle_type}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Source Location</label>
            <input
              type="text"
              name="source_location"
              value={formData.source_location}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="materials-section">
          <h3>Materials</h3>
          {materials.map((material, index) => (
            <div key={index} className="material-row">
              <div className="form-row">
                <div className="form-group">
                  <label>Material Name</label>
                  <input
                    type="text"
                    value={material.name}
                    onChange={(e) => handleMaterialChange(index, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={material.quantity}
                    onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>UoM</label>
                  <select
                    value={material.uom}
                    onChange={(e) => handleMaterialChange(index, 'uom', e.target.value)}
                    required
                  >
                    <option value="">Select UoM</option>
                    {uomOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              {materials.length > 1 && (
                <button
                  type="button"
                  className="remove-material-button"
                  onClick={() => removeMaterial(index)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="add-material-button"
            onClick={addMaterial}
          >
            Add Material
          </button>
        </div>

        <div className="form-group">
          <label>Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
            rows="4"
          />
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Entry'}
        </button>
      </form>
    </div>
  );
};

export default InwardEntryForm;