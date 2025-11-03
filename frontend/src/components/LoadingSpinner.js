/**
 * Loading Spinner Component
 * 
 * Displays a loading message with proper accessibility attributes
 * to inform users when content is being fetched.
 */

import React from 'react';

/**
 * LoadingSpinner component for indicating loading state
 * 
 * @returns {JSX.Element} Loading message element
 */
function LoadingSpinner() {
  return (
    <div className="loading" role="status" aria-live="polite">
      Loading events...
    </div>
  );
}

export default LoadingSpinner;