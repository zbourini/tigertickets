/**
 * Status Message Component
 * 
 * Displays success or error messages to the user with proper ARIA attributes
 * for accessibility and screen reader support.
 */

import React from 'react';

/**
 * StatusMessage component for displaying user feedback
 * 
 * @param {Object} props - Component properties
 * @param {string} props.message - Message to display
 * @returns {JSX.Element|null} Status message element or null if no message
 */
function StatusMessage({ message }) {
  if (!message) return null;

  const isSuccess = message.includes('✅');
  
  return (
    <div 
      className={`message ${isSuccess ? 'success' : 'error'}`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export default StatusMessage;