import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../../config';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddUser, setShowAddUser] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState([]);
  const [inwardEntries, setInwardEntries] = useState([]);
  const [outwardEntries, setOutwardEntries] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInward: 0,
    totalOutward: 0
  });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'User',
    location: ''
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pagination, setPagination] = useState({
    users: { page: 1, itemsPerPage: 10 },
    inward: { page: 1, itemsPerPage: 10 },
    outward: { page: 1, itemsPerPage: 10 }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch all data in parallel
      const [usersRes, inwardRes, outwardRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/users`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/inward-entries`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/outward-entries`, { headers })
      ]);

      setUsers(usersRes.data);
      setInwardEntries(inwardRes.data);
      setOutwardEntries(outwardRes.data);
      
      setStats({
        totalUsers: usersRes.data.length,
        totalInward: inwardRes.data.length,
        totalOutward: outwardRes.data.length
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error fetching data');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/users`, newUser, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSuccess('User added successfully!');
      setError('');
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'User',
        location: ''
      });
      fetchData(); // Refresh all data
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding user');
      setSuccess('');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/api/users/${userId}/toggle-status`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      fetchData();
      setSuccess('User status updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating user status');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/api/users/${selectedUser.id}/change-password`,
        { newPassword },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
      setSuccess('Password changed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error changing password');
    }
  };

  const handlePageChange = (type, newPage) => {
    setPagination(prev => ({
      ...prev,
      [type]: { ...prev[type], page: newPage }
    }));
  };

  const getPaginatedData = (data, type) => {
    const { page, itemsPerPage } = pagination[type];
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const getPageCount = (data, type) => {
    return Math.ceil(data.length / pagination[type].itemsPerPage);
  };

  function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US'); // This will return "MM/DD/YYYY"
  }

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const handleExportInward = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/export/inward-entries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.data.data || response.data.data.length === 0) {
        setError('No data to export');
        return;
      }

      // Convert to CSV
      const csvContent = convertToCSV(response.data.data);
      
      // Create Blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inward_entries_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setError('Error exporting data');
    }
  };

  const handleExportOutward = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/export/outward-entries`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.data.data || response.data.data.length === 0) {
        setError('No data to export');
        return;
      }

      // Convert to CSV
      const csvContent = convertToCSV(response.data.data);
      
      // Create Blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `outward_entries_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      setError('Error exporting data');
    }
  };

  const generatePaginationNumbers = (currentPage, totalPages) => {
    let pages = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
      }
    }
    return pages;
  };

  if (!user || user.role !== 'Admin') {
    navigate('/login');
    return null;
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-left">
          <h2>Admin Dashboard</h2>
        </div>
        <div className="nav-right">
          <div className="user-info">
            <span>Welcome, {user.name}</span>
            <button onClick={handleLogout} className="logout-button">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        {/* Stats Overview */}
        <div className="stats-grid">
          <div className="stat-card users">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-details">
              <h3>Total Users</h3>
              <p>{stats.totalUsers}</p>
            </div>
          </div>
          <div className="stat-card inward">
            <div className="stat-icon">
              <i className="fas fa-sign-in-alt"></i>
            </div>
            <div className="stat-details">
              <h3>Inward Entries</h3>
              <p>{stats.totalInward}</p>
            </div>
          </div>
          <div className="stat-card outward">
            <div className="stat-icon">
              <i className="fas fa-sign-out-alt"></i>
            </div>
            <div className="stat-details">
              <h3>Outward Entries</h3>
              <p>{stats.totalOutward}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
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

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'users' && (
            <div className="section">
              <div className="section-header">
                <h3 style={{ marginRight: 'auto' }}>User Management</h3>
                <button 
                  className="action-button"
                  onClick={() => setShowAddUser(!showAddUser)}
                >
                  <i className="fas fa-plus"></i>
                  {showAddUser ? 'Hide Form' : 'Add User'}
                </button>
              </div>

              {showAddUser && (
                <form className="add-user-form" onSubmit={handleAddUser}>
                  <div className="form-header">
                    <h4>Create New User Account</h4>
                    <p>Fill in the information below to create a new user account</p>
                  </div>

                  {error && (
                    <div className="error-message">
                      <i className="fas fa-exclamation-circle"></i>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="success-message">
                      <i className="fas fa-check-circle"></i>
                      {success}
                    </div>
                  )}
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <div className="input-icon-wrapper">
                        <input
                          type="text"
                          name="name"
                          value={newUser.name}
                          onChange={handleInputChange}
                          placeholder="Enter Name"
                          required
                        />
                        <i className="fas fa-user input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <div className="input-icon-wrapper">
                        <input
                          type="email"
                          name="email"
                          value={newUser.email}
                          onChange={handleInputChange}
                          placeholder="Enter Email"
                          required
                        />
                        <i className="fas fa-envelope input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Password</label>
                      <div className="input-icon-wrapper">
                        <input
                          type="password"
                          name="password"
                          value={newUser.password}
                          onChange={handleInputChange}
                          placeholder="Enter secure password"
                          required
                        />
                        <i className="fas fa-lock input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>User Role</label>
                      <div className="input-icon-wrapper">
                        <select
                          name="role"
                          value={newUser.role}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select role</option>
                          <option value="User">User</option>
                          <option value="Viewer">Viewer</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <i className="fas fa-user-shield input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Location</label>
                      <div className="input-icon-wrapper">
                        <input
                          type="text"
                          name="location"
                          value={newUser.location}
                          onChange={handleInputChange}
                          placeholder="Office location"
                          required
                        />
                        <i className="fas fa-map-marker-alt input-icon"></i>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="submit-button">
                    <i className="fas fa-user-plus"></i>
                    Create Account
                  </button>
                </form>
              )}

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Location</th>
                      <th>Last Login</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(users, 'users').map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${user.role.toLowerCase()}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>{user.location || '-'}</td>
                        <td>{formatDate(user.last_login)}</td>
                        <td>{formatDate(user.updated_at)}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className={`status-button ${user.is_disabled ? 'enable' : 'disable'}`}
                              onClick={() => handleToggleUserStatus(user.id)}
                            >
                              {user.is_disabled ? 'Enable' : 'Disable'}
                            </button>
                            <button
                              className="password-button"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPasswordModal(true);
                              }}
                            >
                              Change Password
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button
                    className="pagination-button nav-button"
                    disabled={pagination.users.page === 1}
                    onClick={() => handlePageChange('users', pagination.users.page - 1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  {generatePaginationNumbers(pagination.users.page, getPageCount(users, 'users')).map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={pageNum}
                        className={`pagination-button ${pagination.users.page === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange('users', pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}

                  <button
                    className="pagination-button nav-button"
                    disabled={pagination.users.page === getPageCount(users, 'users')}
                    onClick={() => handlePageChange('users', pagination.users.page + 1)}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inward' && (
            <div className="section">
              <div className="section-header">
                <h3 style={{ marginRight: 'auto' }}>Inward Entries</h3>
                <button 
                  className="action-button"
                  onClick={handleExportInward}
                >
                  <i className="fas fa-download"></i> Export to CSV
                </button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Serial Number</th>
                      <th>Date</th>
                      <th>Party Name</th>
                      <th>Bill Details</th>
                      <th>Vehicle Info</th>
                      <th>Materials & UoM</th>
                      <th>Timings</th>
                      <th>Created By</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(inwardEntries, 'inward').map(entry => (
                      <tr key={entry.id}>
                        <td>{entry.serial_number}</td>
                        <td>{formatDate(entry.entry_date)}</td>
                        <td>
                          <div>{entry.party_name}</div>
                          <div className="text-muted">{entry.source_location}</div>
                        </td>
                        <td>
                          <div>Bill #{entry.bill_number}</div>
                          <div className="text-muted">₹{entry.bill_amount}</div>
                        </td>
                        <td>
                          <div>{entry.vehicle_type}</div>
                          <div className="text-muted">{entry.entry_type}</div>
                        </td>
                        <td>
                          <div className="materials-list">
                            <div className="materials-names">
                              {entry.materials.map(material => material.material_name).join('\n')}
                            </div>
                            <div className="text-muted quantities">
                              {entry.materials.map(material => `${material.quantity} ${material.uom}`).join('\n')}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>In: {entry.time_in}</div>
                          {entry.time_out && <div>Out: {entry.time_out}</div>}
                        </td>
                        <td>{entry.created_by_name}</td>
                        <td>
                          <div className="remarks">{entry.remarks || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button
                    className="pagination-button nav-button"
                    disabled={pagination.inward.page === 1}
                    onClick={() => handlePageChange('inward', pagination.inward.page - 1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  {generatePaginationNumbers(pagination.inward.page, getPageCount(inwardEntries, 'inward')).map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={pageNum}
                        className={`pagination-button ${pagination.inward.page === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange('inward', pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}

                  <button
                    className="pagination-button nav-button"
                    disabled={pagination.inward.page === getPageCount(inwardEntries, 'inward')}
                    onClick={() => handlePageChange('inward', pagination.inward.page + 1)}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'outward' && (
            <div className="section">
              <div className="section-header">
                <h3 style={{ marginRight: 'auto' }}>Outward Entries</h3>
                <button 
                  className="action-button"
                  onClick={handleExportOutward}
                >
                  <i className="fas fa-download"></i> Export to CSV
                </button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Serial Number</th>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Driver Info</th>
                      <th>Vehicle Info</th>
                      <th>Materials</th>
                      <th>Purpose & Party</th>
                      <th>Bill Details</th>
                      <th>Timings</th>
                      <th>Other Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData(outwardEntries, 'outward').map(entry => (
                      <tr key={entry.id}>
                        <td>{entry.serial_number}</td>
                        <td>{formatDate(entry.entry_date)}</td>
                        <td>
                          <div className="source-badge">{entry.source}</div>
                        </td>
                        <td>
                          <div>{entry.driver_name}</div>
                          <div className="text-muted">{entry.driver_mobile}</div>
                        </td>
                        <td>
                          <div>{entry.vehicle_number}</div>
                          <div className="text-muted">{entry.vehicle_type}</div>
                        </td>
                        <td>
                          <div className="materials-list">
                            <div className="materials-names">
                              {entry.materials.map(material => material.material_name).join('\n')}
                            </div>
                            <div className="text-muted quantities">
                              {entry.materials.map(material => `${material.quantity} ${material.uom}`).join('\n')}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="purpose-badge">{entry.purpose || '-'}</div>
                          {entry.party_name && (
                            <div className="text-muted mt-2">
                              Party: {entry.party_name}
                            </div>
                          )}
                        </td>
                        <td>
                          {entry.bill_number ? (
                            <>
                              <div>Bill #{entry.bill_number}</div>
                              <div className="text-muted">₹{entry.bill_amount}</div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <div>In: {entry.time_in}</div>
                          {entry.time_out && <div>Out: {entry.time_out}</div>}
                        </td>
                        <td>
                          <div>
                            {entry.check_by && (
                              <div className="check-by">
                                Checked by: {entry.check_by}
                              </div>
                            )}
                            {entry.remarks && (
                              <div className="remarks mt-2">{entry.remarks}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button
                    className="pagination-button nav-button"
                    disabled={pagination.outward.page === 1}
                    onClick={() => handlePageChange('outward', pagination.outward.page - 1)}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  
                  {generatePaginationNumbers(pagination.outward.page, getPageCount(outwardEntries, 'outward')).map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                    ) : (
                      <button
                        key={pageNum}
                        className={`pagination-button ${pagination.outward.page === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange('outward', pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}

                  <button
                    className="pagination-button nav-button"
                    disabled={pagination.outward.page === getPageCount(outwardEntries, 'outward')}
                    onClick={() => handlePageChange('outward', pagination.outward.page + 1)}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="section">
              <div className="section-header">
                <h3 style={{ marginRight: 'auto' }}>Recent Activity</h3>
              </div>
              <div className="activity-grid">
                <div className="activity-card">
                  <h4>Recent Users</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Last Login</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.slice(0, 5).map(user => (
                          <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>
                              <span className={`role-badge ${user.role.toLowerCase()}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>{formatDate(user.last_login)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="activity-card">
                  <h4>Recent Inward Entries</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Serial No.</th>
                          <th>Party</th>
                          <th>Created By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inwardEntries.slice(0, 5).map(entry => (
                          <tr key={entry.id}>
                            <td>{entry.serial_number}</td>
                            <td>{entry.party_name}</td>
                            <td>{entry.created_by_name}</td>
                            
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="activity-card">
                  <h4>Recent Outward Entries</h4>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Serial No.</th>
                          <th>Party</th>
                          <th>Created By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outwardEntries.slice(0, 5).map(entry => (
                          <tr key={entry.id}>
                            <td>{entry.serial_number}</td>
                            <td>{entry.party_name}</td>
                            <td>{entry.created_by_name}</td>
                            
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Change Password for {selectedUser?.name}</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>New Password:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="submit-button">
                  Change Password
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
