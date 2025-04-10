import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EditOutwardModal from './EditOutwardModal';
import EntryHistoryTable from '../common/EntryHistoryTable';
import { API_BASE_URL } from '../../config';
import './OutwardEntry.css';

const OutwardEntryHistory = ({ showCreatedBy = false }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/api/outward-entries`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Ensure we have an array of entries, even if empty
      const entriesData = Array.isArray(response.data) ? response.data :
                         response.data.entries ? response.data.entries : [];
      
      setEntries(entriesData);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Error fetching entries');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry({
      ...entry,
      materials_list: entry.materials_list || []
    });
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditingEntry(null);
    setError('');
  };

  const handleMaterialChange = (index, field, value) => {
    setEditingEntry(prev => {
      const updatedMaterials = [...(prev.materials_list || [])];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        [field]: value
      };
      return {
        ...prev,
        materials_list: updatedMaterials
      };
    });
  };

  const addMaterial = () => {
    setEditingEntry(prev => ({
      ...prev,
      materials_list: [
        ...(prev.materials_list || []),
        { name: '', quantity: '', uom: '' }
      ]
    }));
  };

  const removeMaterial = (index) => {
    setEditingEntry(prev => ({
      ...prev,
      materials_list: (prev.materials_list || []).filter((_, i) => i !== index)
    }));
  };

  const handleChange = (field, value) => {
    setEditingEntry(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveChanges = async () => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      
      const updateData = {
        purpose: editingEntry.purpose,
        check_by: editingEntry.check_by,
        party_name: editingEntry.party_name,
        bill_number: editingEntry.bill_number,
        bill_amount: editingEntry.bill_amount,
        remarks: editingEntry.remarks,
        time_out: editingEntry.time_out,
        materials: editingEntry.materials_list.map(m => ({
          name: m.name || '',
          quantity: m.quantity || '',
          uom: m.uom || ''
        }))
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/outward-entries/${editingEntry.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` }}
      );

      if (response.data) {
        // Update the entries list with the new data
        const updatedEntry = response.data.entry || response.data;
        setEntries(entries.map(entry => 
          entry.id === editingEntry.id ? updatedEntry : entry
        ));
        
        setSuccess('Changes saved successfully!');
        setEditingEntry(null);
      }
    } catch (err) {
      console.error('Error saving changes:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error saving changes');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading entries...</div>;
  }

  return (
    <div className="outward-entry-history">
      <h2>Outward Entry History</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {entries.length === 0 ? (
        <div className="no-entries">No entries found</div>
      ) : (
        <EntryHistoryTable 
          entries={entries}
          onEdit={handleEdit}
          type="outward"
          showCreatedBy={showCreatedBy}
        />
      )}

      {editingEntry && (
        <EditOutwardModal
          editingEntry={editingEntry}
          handleChange={handleChange}
          handleMaterialChange={handleMaterialChange}
          addMaterial={addMaterial}
          removeMaterial={removeMaterial}
          handleSave={saveChanges}
          handleCancel={handleCancel}
          error={error}
          success={success}
        />
      )}
    </div>
  );
};

export default OutwardEntryHistory;
