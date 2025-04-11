import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EntryHistoryTable from '../common/EntryHistoryTable'; // Change this import
import { API_BASE_URL } from '../../config';
import './InwardEntry.css';

const InwardEntryHistory = ({ showCreatedBy = false }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/inward-entries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(response.data);
      setLoading(false);
    } catch (err) {
      setError('Error fetching entries');
      setLoading(false);
    }
  };

  const handleTimeoutUpdate = async (id) => {
    try {
      setError('');
      setSuccess('');
      const token = localStorage.getItem('token');
      
      // Format current time in HH:mm format
      const now = new Date();
      const time_out = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      await axios.patch(
        `${API_BASE_URL}/api/inward-entries/${id}/timeout`,
        { time_out },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      // Update the entry in the local state with formatted time
      setEntries(entries.map(entry => 
        entry.id === id ? { ...entry, time_out } : entry
      ));
      setSuccess('Time out updated successfully');
    } catch (err) {
      console.error('Error updating timeout:', err);
      setError(err.response?.data?.message || 'Error updating timeout');
    }
  };

  if (loading) return <div className="loading">Loading entries...</div>;

  return (
    <div className="inward-entry-history">
      <h2>Inward Entry History</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <EntryHistoryTable 
        entries={entries}
        onTimeoutUpdate={handleTimeoutUpdate}
        type="inward"
        showCreatedBy={showCreatedBy}
      />
    </div>
  );
};

export default InwardEntryHistory;
