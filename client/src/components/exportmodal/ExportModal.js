import React from 'react';
import './ExportModal.css';

const ExportModal = ({ isOpen, onClose, onExport, type }) => {
  if (!isOpen) return null;

  const handleExport = (dateType) => {
    onExport(dateType);
    onClose();
  };

  return (
    <div className="export-modal-overlay">
      <div className="export-modal">
        <div className="export-modal-header">
          <h3>Export {type} Entries</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="export-modal-content">
          <p>Select the date range to export:</p>
          <div className="export-options">
            <button 
              className="export-option-button"
              onClick={() => handleExport('today')}
            >
              <i className="fas fa-calendar-day"></i>
              Today's Entries
            </button>
            <button 
              className="export-option-button"
              onClick={() => handleExport('yesterday')}
            >
              <i className="fas fa-calendar-minus"></i>
              Yesterday's Entries
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
