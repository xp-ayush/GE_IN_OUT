import React from 'react';
import Navbar from './Navbar';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <div className="layout-container">
        {children}
      </div>
    </div>
  );
};

export default Layout;
