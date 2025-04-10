import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EntryHistoryTable from '../../common/EntryHistoryTable';
import './ViewerDashboard.css';
import { API_BASE_URL } from '../../../config';
import axios from 'axios';

const ViewerDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [inwardEntries, setInwardEntries] = useState([]);
  const [outwardEntries, setOutwardEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('inward');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Fetch inward entries
      const inwardResponse = await fetch(`${API_BASE_URL}/api/inward-entries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!inwardResponse.ok) {
        throw new Error(`Inward entries fetch failed: ${inwardResponse.status}`);
      }

      const inwardData = await inwardResponse.json();
      setInwardEntries(inwardData);

      // Fetch outward entries
      const outwardResponse = await fetch(`${API_BASE_URL}/api/outward-entries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!outwardResponse.ok) {
        throw new Error(`Outward entries fetch failed: ${outwardResponse.status}`);
      }

      const outwardData = await outwardResponse.json();
      setOutwardEntries(outwardData);
      
    } catch (error) {
      console.error('Error fetching entries:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    // Get all possible headers from all objects
    const headers = Array.from(new Set(
      data.reduce((acc, obj) => [...acc, ...Object.keys(obj)], [])
    ));

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        let value = row[header] || '';
        // Handle materials specially
        if (header === 'Materials' && Array.isArray(row.materials_list)) {
          value = row.materials_list
            .map(m => `${m.name || ''} (${m.quantity || ''} ${m.uom || ''})`)
            .join('; ');
        }
        // Handle dates
        if (header === 'Date' && row.entry_date) {
          value = new Date(row.entry_date).toLocaleDateString();
        }
        // Escape special characters
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          // If value contains comma, newline or double quote, wrap in quotes
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportInward = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/export/inward-entries`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.data || !response.data.data || response.data.data.length === 0) {
        setError('No data available to export');
        return;
      }

      const csvContent = convertToCSV(response.data.data);
      const filename = `inward_entries_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Export error:', error);
      setError(error.response?.data?.message || 'Error exporting data. Please try again.');
    }
  };

  const handleExportOutward = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/export/outward-entries`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.data || !response.data.data || response.data.data.length === 0) {
        setError('No data available to export');
        return;
      }

      const csvContent = convertToCSV(response.data.data);
      const filename = `outward_entries_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Export error:', error);
      setError(error.response?.data?.message || 'Error exporting data. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user || user.role !== 'Viewer') {
    navigate('/login');
    return null;
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <h2>Viewer Dashboard</h2>
        <div className="user-info">
          <span>Welcome, {user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'inward' ? 'active' : ''}`}
            onClick={() => setActiveTab('inward')}
          >
            Inward Entries
          </button>
          <button 
            className={`tab-button ${activeTab === 'outward' ? 'active' : ''}`}
            onClick={() => setActiveTab('outward')}
          >
            Outward Entries
          </button>
        </div>

        <div className="table-container">
          {error && (
            <div className="error-message">
              Error: {error}
            </div>
          )}
          
          {loading ? (
            <div className="loading-message">Loading entries...</div>
          ) : (
            <>
              <div className="section-header">
                <button 
                  className="action-button"
                  onClick={activeTab === 'inward' ? handleExportInward : handleExportOutward}
                >
                  <i className="fas fa-download"></i> Export to CSV
                </button>
              </div>
              {activeTab === 'inward' ? (
                <EntryHistoryTable 
                  entries={inwardEntries} 
                  type="inward"
                  showActions={false} 
                  readOnly={true}
                  showCreatedBy={true} 
                />
              ) : (
                <EntryHistoryTable 
                  entries={outwardEntries} 
                  type="outward"
                  showActions={false} 
                  readOnly={true}
                  showCreatedBy={true} 
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewerDashboard;
