/**
 * Refresh Button Component
 * 
 * Provides a refresh functionality button with proper accessibility
 * and loading state handling.
 */

import React from 'react';

/**
 * RefreshButton component for refreshing the events list
 * 
 * @param {Object} props - Component properties
 * @param {Function} props.onRefresh - Function to call when refresh is clicked
 * @param {boolean} props.isLoading - Whether data is currently loading
 * @returns {JSX.Element} Refresh button section
 */
function RefreshButton({ onRefresh, isLoading }) {
  return (
    <div className="refresh-section">
      <button 
        onClick={onRefresh} 
        className="refresh-btn"
        disabled={isLoading}
        aria-label="Refresh events list"
      >
        {isLoading ? 'Refreshing...' : '🔄 Refresh Events'}
      </button>
    </div>
  );
}

export default RefreshButton;