import React, { useState, useMemo } from 'react';
import './EntryHistoryTable.css';

const EntryHistoryTable = ({ entries, onEdit, type, onTimeoutUpdate, showActions = true, readOnly = false, showCreatedBy = false }) => {
  const formatTimeToLocal = (timeStr) => {
    if (!timeStr) return '-';
    const today = new Date().toISOString().split('T')[0];
    const dateTime = new Date(`${today}T${timeStr}`);
    return dateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    vehicle_type: '',
    date_from: '',
    date_to: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 10;

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Status filter
      if (filters.status !== 'all') {
        const entryStatus = entry.time_out ? 'completed' : 'pending';
        if (entryStatus !== filters.status) return false;
      }

      // Vehicle type filter
      if (filters.vehicle_type && entry.vehicle_type !== filters.vehicle_type) {
        return false;
      }

      // Date range filter
      if (filters.date_from || filters.date_to) {
        const entryDate = new Date(entry.entry_date);
        if (filters.date_from && entryDate < new Date(filters.date_from)) return false;
        if (filters.date_to && entryDate > new Date(filters.date_to)) return false;
      }

      // Global search
      if (searchTerm) {
        const searchValue = searchTerm.toLowerCase();
        const searchableValues = Object.entries(entry).reduce((acc, [key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            acc.push(String(value).toLowerCase());
          }
          return acc;
        }, []);

        // Add materials search
        if (entry.materials_list) {
          entry.materials_list.forEach(material => {
            searchableValues.push(
              material.name?.toLowerCase(),
              material.quantity?.toString().toLowerCase(),
              material.uom?.toLowerCase()
            );
          });
        }

        return searchableValues.some(value => value?.includes(searchValue));
      }

      return true;
    });
  }, [entries, searchTerm, filters]);

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

  const renderPagination = () => (
    <div className="pagination">
      <button
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
        className="pagination-button"
      >
        First
      </button>
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="pagination-button"
      >
        Previous
      </button>
      <span className="pagination-info">
        Page {currentPage} of {totalPages} ({filteredEntries.length} entries)
      </span>
      <button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="pagination-button"
      >
        Next
      </button>
      <button
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
        className="pagination-button"
      >
        Last
      </button>
    </div>
  );

  const getEntryStatus = (entry) => {
    const status = entry.time_out ? 'completed' : 'pending';
    return (
      <span className={`status-badge status-${status}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderMaterialsCell = (materials_list) => {
    if (!materials_list || !Array.isArray(materials_list) || materials_list.length === 0) {
      return <td>-</td>;
    }

    return (
      <td className="materials-cell">
        <table className="materials-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Qty</th>
              <th>UoM</th>
            </tr>
          </thead>
          <tbody>
            {materials_list.map((material, idx) => (
              <tr key={idx}>
                <td>{material.name || '-'}</td>
                <td>{material.quantity || '-'}</td>
                <td>{material.uom || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    );
  };

  const renderTimeOutCell = (entry, isInward) => (
    <td>
      {entry.time_out ? (
        formatTimeToLocal(entry.time_out)
      ) : isInward && !readOnly ? (
        <button
          className="update-timeout-button"
          onClick={() => onTimeoutUpdate(entry.id)}
        >
          Set Current Time
        </button>
      ) : (
        'Pending'
      )}
    </td>
  );

  const renderInwardTable = () => (
    <>
      <table>
        <thead>
          <tr>
            <th>Serial No.</th>
            <th>Date</th>
            <th>Party Name</th>
            <th>Bill No.</th>
            <th>Bill Amount</th>
            <th>Entry Type</th>
            <th>Vehicle Type</th>
            <th>Source Location</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Materials</th>
            <th>Remarks</th>
            {showCreatedBy && <th>Created By</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {currentEntries.map(entry => (
            <tr key={entry.id || Math.random()}>
              <td>{entry.serial_number}</td>
              <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
              <td>{entry.party_name || '-'}</td>
              <td>{entry.bill_number || '-'}</td>
              <td>{entry.bill_amount || '-'}</td>
              <td>{entry.entry_type || '-'}</td>
              <td>{entry.vehicle_type || '-'}</td>
              <td>{entry.source_location || '-'}</td>
              <td>{formatTimeToLocal(entry.time_in) || '-'}</td>
              {renderTimeOutCell(entry, true)}
              {renderMaterialsCell(entry.materials_list)}
              <td>{entry.remarks || '-'}</td>
              {showCreatedBy && <td>{entry.created_by_name || '-'}</td>}
              <td>{getEntryStatus(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {renderPagination()}
    </>
  );

  const renderOutwardTable = () => (
    <>
      <table>
        <thead>
          <tr>
            <th>Serial No.</th>
            <th>Date</th>
            <th>Driver Name</th>
            <th>Driver Mobile</th>
            <th>Vehicle No.</th>
            <th>Vehicle Type</th>
            <th>Source</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Purpose</th>
            <th>Check By</th>
            <th>Party Name</th>
            <th>Bill No.</th>
            <th>Bill Amount</th>
            <th>Materials</th>
            <th>Remarks</th>
            {showCreatedBy && <th>Created By</th>}
            {showActions && <th>Actions</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {currentEntries.map(entry => (
            <tr key={entry.id || Math.random()}>
              <td>{entry.serial_number}</td>
              <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
              <td>{entry.driver_name || '-'}</td>
              <td>{entry.driver_mobile || '-'}</td>
              <td>{entry.vehicle_number || '-'}</td>
              <td>{entry.vehicle_type || '-'}</td>
              <td>{entry.source || '-'}</td>
              <td>{formatTimeToLocal(entry.time_in) || '-'}</td>
              {renderTimeOutCell(entry, false)}
              <td>{entry.purpose || '-'}</td>
              <td>{entry.check_by || '-'}</td>
              <td>{entry.party_name || '-'}</td>
              <td>{entry.bill_number || '-'}</td>
              <td>{entry.bill_amount || '-'}</td>
              {renderMaterialsCell(entry.materials_list)}
              <td>{entry.remarks || '-'}</td>
              {showCreatedBy && <td>{entry.created_by_name || '-'}</td>}
              {showActions && (
                <td>
                  <button
                    className="edit-button"
                    onClick={() => onEdit(entry)}
                    disabled={entry.time_out ? true : false}
                    title={entry.time_out ? "Can't edit completed entries" : "Edit entry"}
                  >
                    Edit
                  </button>
                </td>
              )}
              <td>{getEntryStatus(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {renderPagination()}
    </>
  );

  const renderFilterSection = () => (
    <div className="table-filters">
      <div className="filters-header">
        <button 
          className="toggle-filters-button"
          onClick={() => setShowFilters(!showFilters)}
        >
          <i className={`fas fa-filter`}></i>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          <i className={`fas fa-chevron-${showFilters ? 'up' : 'down'}`}></i>
        </button>
        <div className="quick-search">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            placeholder="Quick search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {showFilters && (
        <div className="filters-content">
          <div className="filters-grid">
            <div className="filter-item">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Vehicle Type</label>
              <select
                value={filters.vehicle_type}
                onChange={(e) => setFilters(prev => ({ ...prev, vehicle_type: e.target.value }))}
              >
                <option value="">All Types</option>
                {[...new Set(entries.map(e => e.vehicle_type))].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label>From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              />
            </div>

            <div className="filter-item">
              <label>To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              />
            </div>
          </div>

          <div className="filters-footer">
            <button
              className="clear-filters-button"
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  status: 'all',
                  vehicle_type: '',
                  date_from: '',
                  date_to: '',
                });
              }}
            >
              <i className="fas fa-times"></i>
              Clear All Filters
            </button>
            <div className="results-count">
              <i className="fas fa-table"></i>
              {filteredEntries.length} entries found
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="entry-history-table">
      {renderFilterSection()}
      {type === 'inward' ? renderInwardTable() : renderOutwardTable()}
    </div>
  );
};

export default EntryHistoryTable;
