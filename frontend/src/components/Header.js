/**
 * Header Component
 * 
 * Displays the main header section of the Tiger Tickets application
 * with title and description.
 */

import React from 'react';

/**
 * Header component for the application
 * 
 * @returns {JSX.Element} Header section with title and description
 */
function Header() {
  return (
    <header>
      <h1>Clemson Campus Events</h1>
      <p>Browse and purchase tickets for upcoming events</p>
    </header>
  );
}

export default Header;