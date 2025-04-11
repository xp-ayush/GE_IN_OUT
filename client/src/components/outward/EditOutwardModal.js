import React from 'react';
import './OutwardEntry.css';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Replace with your actual API base URL

const EditOutwardModal = ({
  editingEntry,
  handleChange,
  handleMaterialChange,
  addMaterial,
  removeMaterial,
  handleSave,
  handleCancel,
  error,
  success,
  setError
}) => {
  const uomOptions = [
    'SqY', 'Sq.Ft', 'SqM', 'Cum', 'FTS', 'Kg', 
    'LTR', 'Mtr', 'Nos', 'PRS', 'SET'
  ];

  const purposeOptions = [
    'SALE',
    'RGP',
    'NRGP',
    'Inter Unit Transfer'
  ];

  const handleFieldChange = async (field, value) => {
    if (field === 'bill_number' && value) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/api/validation/bill/${value}`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        if (response.data.exists) {
          setError('This bill number already exists in the system');
        } else {
          setError('');
        }
      } catch (err) {
        console.error('Error checking bill number:', err);
      }
    }
    handleChange(field, value);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Outward Entry</h2>
          <button className="close-button" onClick={handleCancel}>&times;</button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="modal-body">
          <div className="info-grid">
            {/* Purpose Field */}
            <div className="info-item">
              <label>Purpose *</label>
              <select
                value={editingEntry.purpose || ''}
                onChange={(e) => handleFieldChange('purpose', e.target.value)}
                required
              >
                <option value="">Select Purpose</option>
                {purposeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Check By Field */}
            <div className="info-item">
              <label>Check By *</label>
              <input
                type="text"
                value={editingEntry.check_by || ''}
                onChange={(e) => handleFieldChange('check_by', e.target.value)}
                placeholder="Enter checker name"
                required
              />
            </div>

            {/* Party Name Field */}
            <div className="info-item">
              <label>Party Name *</label>
              <input
                type="text"
                value={editingEntry.party_name || ''}
                onChange={(e) => handleFieldChange('party_name', e.target.value)}
                placeholder="Enter party name"
                required
              />
            </div>

            {/* Bill Number Field */}
            <div className="info-item">
              <label>Bill Number *</label>
              <input
                type="text"
                value={editingEntry.bill_number || ''}
                onChange={(e) => handleFieldChange('bill_number', e.target.value)}
                placeholder="Enter bill number"
                required
              />
            </div>

            {/* Bill Amount Field */}
            <div className="info-item">
              <label>Bill Amount *</label>
              <input
                type="number"
                value={editingEntry.bill_amount || ''}
                onChange={(e) => handleFieldChange('bill_amount', e.target.value)}
                placeholder="Enter bill amount"
                required
              />
            </div>

            {/* Time Out Field */}
            <div className="info-item">
              <label>Time Out</label>
              <div className="time-out-container">
                <span>{editingEntry.time_out || 'Not set'}</span>
                <button 
                  type="button" 
                  className="set-current-time-btn"
                  onClick={() => {
                    const now = new Date();
                    const currentTime = now.toTimeString().split(' ')[0].slice(0, 5);
                    handleFieldChange('time_out', currentTime);
                  }}
                >
                  Set Current Time
                </button>
              </div>
            </div>

            {/* Remarks Field */}
            <div className="info-item">
              <label>Remarks</label>
              <textarea
                value={editingEntry.remarks || ''}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                placeholder="Enter remarks"
              />
            </div>
          </div>

          {/* Materials Section */}
          <div className="materials-section">
            <div className="materials-header">
              <h3>Materials *</h3>
              <button type="button" className="add-material-btn" onClick={addMaterial}>
                Add Material
              </button>
            </div>
            <div className="materials-edit-list">
              {(editingEntry.materials_list || []).map((material, index) => (
                <div key={index} className="material-edit-row">
                  <div className="material-edit-fields">
                    <div className="material-field">
                      <label>Material Name *</label>
                      <input
                        type="text"
                        value={material.name || ''}
                        onChange={(e) => handleMaterialChange(index, 'name', e.target.value)}
                        placeholder="Enter material name"
                        required
                      />
                    </div>
                    <div className="material-field">
                      <label>Quantity *</label>
                      <input
                        type="number"
                        value={material.quantity || ''}
                        onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                        placeholder="Enter quantity"
                        required
                      />
                    </div>
                    <div className="material-field">
                      <label>UoM *</label>
                      <select
                        value={material.uom || ''}
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
                  <button 
                    type="button" 
                    className="remove-material-btn"
                    onClick={() => removeMaterial(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className="save-btn" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOutwardModal;
