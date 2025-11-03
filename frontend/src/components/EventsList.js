/**
 * Events List Component
 * 
 * Renders a list of events with proper accessibility attributes
 * and handles empty state display.
 */

import React from 'react';
import EventItem from './EventItem';

/**
 * EventsList component for displaying multiple events
 * 
 * @param {Object} props - Component properties
 * @param {Array} props.events - Array of event objects
 * @param {Function} props.onPurchase - Function to handle ticket purchase
 * @param {number|null} props.purchasingEventId - ID of event currently being purchased
 * @returns {JSX.Element} Events list section
 */
function EventsList({ events, onPurchase, purchasingEventId }) {
  // Handle null or undefined events
  const safeEvents = events || [];
  
  return (
    <>
      {/* Events count */}
      <div className="events-count" aria-live="polite">
        {safeEvents.length === 0 
          ? 'No events available' 
          : `${safeEvents.length} event${safeEvents.length === 1 ? '' : 's'} available`
        }
      </div>
      
      {/* Events list */}
      {safeEvents.length > 0 && (
        <ul className="events-list" role="list">
          {safeEvents.map((event) => (
            <EventItem
              key={event.id}
              event={event}
              onPurchase={onPurchase}
              isPurchasing={purchasingEventId === event.id}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export default EventsList;