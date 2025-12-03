import React, { useEffect, useState } from 'react';
import './App.css';
import { 
  Header, 
  StatusMessage, 
  LoadingSpinner, 
  EventsList, 
  RefreshButton,
  ChatSidebar
} from './components';
import Login from './components/Login';
import Register from './components/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import dotenv from 'dotenv';

// Init environment variables
dotenv.config();

/**
 * Main App Content Component
 * Separated to use the useAuth hook inside AuthProvider
 */
function AppContent() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [purchasing, setPurchasing] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  const { isAuthenticated, loading: authLoading, login, user } = useAuth();

  /**
   * Fetch events from the client service API
   * Updates the events state with data from the backend
   */
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.BASE_URL}/api/client/events`);
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
    // Only fetch events if authenticated or show auth forms
    if (isAuthenticated) {
      fetchEvents();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Purchase a ticket for a specific event
   * Sends POST request to the client service and updates the UI
   * Protected: Requires authentication
   * 
   * @param {number} eventId - ID of the event to purchase ticket for
   * @param {string} eventName - Name of the event for display purposes
   */
  const buyTicket = async (eventId, eventName) => {
    if (!isAuthenticated) {
      setMessage('Please login to purchase tickets');
      setShowLogin(true);
      return;
    }

    try {
      setPurchasing(eventId);
      setMessage('');
      
      const response = await fetch(`${process.env.BASE_URL}/api/client/events/${eventId}/purchase`, {
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
        setMessage(`Successfully purchased ticket for ${eventName}!`);
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`Error: ${data.message || 'Failed to purchase ticket'}`);
      }
    } catch (error) {
      setMessage('Error: Failed to connect to the server');
      console.error('Error purchasing ticket:', error);
    } finally {
      setPurchasing(null);
    }
  };

  /**
   * Handle purchase from chat sidebar
   * Updates the events list when a purchase is made through chat
   */
  const handleChatPurchase = (eventId, updatedEvent) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? { ...event, tickets_available: updatedEvent.tickets_available }
          : event
      )
    );
  };

  /**
   * Handle successful login
   */
  const handleLoginSuccess = (userData, token) => {
    login(userData, token);
    setShowLogin(false);
    setMessage(`Welcome back, ${userData.email}!`);
    setTimeout(() => setMessage(''), 3000);
  };

  /**
   * Handle successful registration
   */
  const handleRegisterSuccess = (userData, token) => {
    login(userData, token);
    setShowRegister(false);
    setMessage(`Welcome, ${userData.email}! Account created successfully.`);
    setTimeout(() => setMessage(''), 3000);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="App">
        <Header />
        <main>
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  // Show login/register forms if not authenticated
  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <div className="App">
          <Header />
          <Register 
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => {
              setShowRegister(false);
              setShowLogin(true);
            }}
          />
        </div>
      );
    }
    
    return (
      <div className="App">
        <Header />
        <Login 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      </div>
    );
  }

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

      {/* Chat Sidebar for AI-powered ticket booking */}
      <ChatSidebar onPurchase={handleChatPurchase} />
    </div>
  );
}

/**
 * Main App component wrapped with AuthProvider
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;