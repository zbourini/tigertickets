import React, { useEffect, useState } from 'react';
import './App.css';
import { 
  Header, 
  StatusMessage, 
  LoadingSpinner, 
  EventsList, 
  RefreshButton 
} from './components';

/**
 * Main App component for the Tiger Tickets application
 * Manages state and coordinates between components for event display and ticket purchasing
 */
function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [purchasing, setPurchasing] = useState(null); // Track which event is being purchased

  /**
   * Fetch events from the client service API
   * Updates the events state with data from the backend
   */
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:6001/api/events');
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events);
        setMessage('');
      } else {
        setMessage('Failed to load events');
        console.error('Error loading events:', data.message);
      }
    } catch (error) {
      setMessage('Failed to connect to the server');
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  /**
   * Purchase a ticket for a specific event
   * Sends POST request to the client service and updates the UI
   * 
   * @param {number} eventId - ID of the event to purchase ticket for
   * @param {string} eventName - Name of the event for display purposes
   */
  const buyTicket = async (eventId, eventName) => {
    try {
      setPurchasing(eventId);
      setMessage('');
      
      const response = await fetch(`http://localhost:6001/api/events/${eventId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketCount: 1 })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update the local events state to reflect the purchase
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === eventId 
              ? { ...event, tickets_available: data.event.tickets_available }
              : event
          )
        );
        setMessage(`✅ Successfully purchased ticket for ${eventName}!`);
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${data.message || 'Failed to purchase ticket'}`);
      }
    } catch (error) {
      setMessage('❌ Failed to connect to the server');
      console.error('Error purchasing ticket:', error);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="App">
      <Header />
      
      <main>
        <StatusMessage message={message} />
        
        {loading ? (
          <LoadingSpinner />
        ) : (
          <EventsList
            events={events}
            onPurchase={buyTicket}
            purchasingEventId={purchasing}
          />
        )}
        
        <RefreshButton 
          onRefresh={fetchEvents} 
          isLoading={loading} 
        />
      </main>
    </div>
  );
}

export default App;