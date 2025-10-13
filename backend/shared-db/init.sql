-- Tiger Tickets Database Schema
-- This file initializes the shared SQLite database

-- Events table to store event information
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    tickets_available INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);

-- Insert sample data for testing
INSERT OR IGNORE INTO events (id, name, date, tickets_available) VALUES 
(1, 'Clemson vs South Carolina Football', '2025-11-29', 80000),
(2, 'Clemson Basketball vs Duke', '2025-12-15', 9000),
(3, 'Spring Career Fair', '2026-02-20', 500);