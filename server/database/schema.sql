CREATE DATABASE IF NOT EXISTS gateentry;
USE gateentry;


CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('User', 'Admin', 'Viewer') NOT NULL DEFAULT 'User',
    last_login TIMESTAMP NULL,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    location VARCHAR(255),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE inward_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serial_number VARCHAR(20) NOT NULL,
  entry_date DATE NOT NULL,
  party_name VARCHAR(100) NOT NULL,
  bill_number VARCHAR(50) NOT NULL,
  bill_amount DECIMAL(10, 2) NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  source_location VARCHAR(100) NOT NULL,
  time_in TIME NOT NULL,
  time_out TIME,
  remarks TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE inward_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inward_entry_id INT NOT NULL,
  material_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inward_entry_id) REFERENCES inward_entries(id) ON DELETE CASCADE
);

-- Create drivers table for storing driver information
CREATE TABLE drivers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create vehicles table for storing vehicle information
CREATE TABLE vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vehicle_number VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create outward entries table
CREATE TABLE outward_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serial_number VARCHAR(20) NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  driver_mobile VARCHAR(15) NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  vehicle_number VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  source ENUM('Baddi Unit 1', 'Baddi Unit 2', 'Baddi Unit 3') NOT NULL,
  time_in TIME NOT NULL,
  time_out TIME,
  purpose ENUM('SALE', 'RGP', 'Inter Unit Transfer') DEFAULT NULL,
  check_by VARCHAR(100) DEFAULT NULL,
  party_name VARCHAR(100) DEFAULT NULL,
  bill_number VARCHAR(50) DEFAULT NULL,
  bill_amount DECIMAL(10, 2) DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (driver_mobile) REFERENCES drivers(mobile),
  FOREIGN KEY (vehicle_number) REFERENCES vehicles(vehicle_number)
);

-- Create outward materials table
CREATE TABLE outward_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  outward_entry_id INT NOT NULL,
  material_name VARCHAR(100) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (outward_entry_id) REFERENCES outward_entries(id) ON DELETE CASCADE
);

-- Add missing columns if they don't exist
ALTER TABLE outward_entries
ADD COLUMN IF NOT EXISTS bill_amount DECIMAL(10, 2) AFTER bill_number,
ADD COLUMN IF NOT EXISTS remarks TEXT AFTER bill_amount;
