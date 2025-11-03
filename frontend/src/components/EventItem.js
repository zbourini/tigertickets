/**
 * Event Item Component
 * 
 * Displays individual event information including name, date, available tickets,
 * and purchase button with full accessibility support.
 */

import React from 'react';

/**
 * EventItem component for displaying event details and purchase functionality
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.event - Event data object
 * @param {number} props.event.id - Event ID
 * @param {string} props.event.name - Event name
 * @param {string} props.event.date - Event date
 * @param {number} props.event.tickets_available - Number of available tickets
 * @param {Function} props.onPurchase - Function to handle ticket purchase
 * @param {boolean} props.isPurchasing - Whether this event is currently being purchased
 * @returns {JSX.Element} Event item list element
 */
function EventItem({ event, onPurchase, isPurchasing }) {
  const { id, name, date, tickets_available } = event;
  const isSoldOut = tickets_available === 0;
  const ticketText = tickets_available === 1 ? 'ticket' : 'tickets';

  /**
   * Handle purchase button click
   * Calls the parent's onPurchase function with event details
   */
  const handlePurchase = () => {
    onPurchase(id, name);
  };

  return (
    <li className="event-item" role="listitem">
      <div className="event-info">
        <h2 className="event-name">{name}</h2>
        <p className="event-date">
          <span className="label">Date: </span> 
          <time dateTime={date}>{new Date(date).toLocaleDateString()}</time>
        </p>
        <p className="event-tickets">
          <span className="label">Tickets Available: </span> 
          <span 
            className={`ticket-count ${isSoldOut ? 'sold-out' : ''}`}
            aria-label={`${tickets_available} ${ticketText} remaining for ${name}`}
          >
            {tickets_available}
          </span>
        </p>
      </div>
      
      <div className="event-actions">
        <button 
          onClick={handlePurchase}
          disabled={isSoldOut || isPurchasing}
          className={`buy-ticket-btn ${isSoldOut ? 'sold-out' : ''}`}
          aria-label={`Buy ticket for ${name} - ${tickets_available} ${ticketText} available`}
          aria-describedby={`event-${id}-status`}
        >
          {isPurchasing ? (
            <>
              <span aria-hidden="true">...</span>
              <span>Processing...</span>
            </>
          ) : isSoldOut ? (
            <>
              <span aria-hidden="true">X</span>
              <span>Sold Out</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">+</span>
              <span>Buy Ticket</span>
            </>
          )}
        </button>
        
        <div 
          id={`event-${id}-status`} 
          className="sr-only"
          aria-live="polite"
        >
          {isSoldOut 
            ? `${name} is sold out` 
            : `${tickets_available} ${ticketText} available for ${name}`
          }
        </div>
      </div>
    </li>
  );
}

export default EventItem;