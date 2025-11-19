/**
 * Header Component
 * 
 * Displays the main header section of the Tiger Tickets application
 * with title, description, and user authentication information.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

/**
 * Header component for the application
 * 
 * @returns {JSX.Element} Header section with title, description, and auth info
 */
function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-text">
          <h1>Clemson Campus Events</h1>
          <p>Browse and purchase tickets for upcoming events</p>
        </div>
        
        {isAuthenticated && user && (
          <div className="header-auth">
            <div className="user-info">
              <span className="user-label">Logged in as:</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="logout-button"
              title="Logout"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;