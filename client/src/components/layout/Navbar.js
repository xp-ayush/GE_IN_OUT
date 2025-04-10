import React from 'react';
import { Link } from 'react-router-dom';
import './Layout.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Outward Entry System</Link>
      </div>
      <div className="navbar-menu">
        <Link to="/outward/new" className="nav-link">New Entry</Link>
        <Link to="/outward/history" className="nav-link">History</Link>
      </div>
      <div className="navbar-end">
        <button className="logout-button">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
