import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import InwardEntryForm from '../inward/InwardEntryForm';
import InwardEntryHistory from '../inward/InwardEntryHistory';
import OutwardEntryForm from '../outward/OutwardEntryForm';
import OutwardEntryHistory from '../outward/OutwardEntryHistory';
import ExportModal from '../exportmodal/ExportModal';
import { API_BASE_URL } from '../../config';
import './Dashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [activeTab, setActiveTab] = useState('inward-form');
  const [error, setError] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleEntryCreated = () => {
    setActiveTab(activeTab === 'inward-form' ? 'inward-history' : 'outward-history');
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Array.from(new Set(
      data.reduce((acc, obj) => [...acc, ...Object.keys(obj)], [])
    ));

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        let value = row[header] || '';
        if (header === 'Materials' && Array.isArray(row.materials_list)) {
          value = row.materials_list
            .map(m => `${m.name || ''} (${m.quantity || ''} ${m.uom || ''})`)
            .join('; ');
        }
        if (header === 'Date' && row.entry_date) {
          value = new Date(row.entry_date).toLocaleDateString();
        }
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
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
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportClick = (type) => {
    setExportType(type);
    setShowExportModal(true);
  };

  const handleExport = async (dateType) => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const date = dateType === 'today' ? today : yesterday;
      const formattedDate = date.toISOString().split('T')[0];

      const response = await axios.get(
        `${API_BASE_URL}/api/export/${exportType}-entries?date=${formattedDate}&userId=${user.id}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.data || response.data.data.length === 0) {
        setError(`No ${dateType} entries available to export`);
        return;
      }

      const csvContent = convertToCSV(response.data.data);
      const filename = `${exportType}_entries_${formattedDate}.csv`;
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Export error:', error);
      setError(error.response?.data?.message || 'Error exporting data. Please try again.');
    }
  };

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <h2>User Dashboard</h2>
        <div className="user-info">
          <span>Welcome, {user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      
      <div className="dashboard-content">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'inward-form' ? 'active' : ''}`}
            onClick={() => setActiveTab('inward-form')}
          >
            New Inward Entry
          </button>
          <button
            className={`tab-button ${activeTab === 'outward-form' ? 'active' : ''}`}
            onClick={() => setActiveTab('outward-form')}
          >
            New Outward Entry
          </button>
          <button
            className={`tab-button ${activeTab === 'inward-history' ? 'active' : ''}`}
            onClick={() => setActiveTab('inward-history')}
          >
            Inward History
          </button>
          <button
            className={`tab-button ${activeTab === 'outward-history' ? 'active' : ''}`}
            onClick={() => setActiveTab('outward-history')}
          >
            Outward History
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'inward-history' && (
          <div>
            <div className="section-header">
              <button 
                className="action-button"
                onClick={() => handleExportClick('inward')}
              >
                <i className="fas fa-download"></i> Export to CSV
              </button>
            </div>
            <InwardEntryHistory showCreatedBy={false} />
          </div>
        )}
        
        {activeTab === 'outward-history' && (
          <div>
            <div className="section-header">
              <button 
                className="action-button"
                onClick={() => handleExportClick('outward')}
              >
                <i className="fas fa-download"></i> Export to CSV
              </button>
            </div>
            <OutwardEntryHistory showCreatedBy={false} />
          </div>
        )}

        {activeTab === 'inward-form' && (
          <InwardEntryForm onEntryCreated={handleEntryCreated} />
        )}
        
        {activeTab === 'outward-form' && (
          <OutwardEntryForm onEntryCreated={handleEntryCreated} />
        )}

        <ExportModal 
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          type={exportType}
        />
      </div>
    </div>
  );
};

export default UserDashboard;
