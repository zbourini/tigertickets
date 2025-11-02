import React, { useState, useRef, useEffect } from 'react';
import './ChatSidebar.css';

/**
 * ChatSidebar component for interacting with the LLM service
 * Allows users to search for events and purchase tickets through natural language
 */
function ChatSidebar({ onPurchase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        type: 'assistant',
        content: 'Hi! I\'m TigerTickets AI. Ask me about events or tell me what you\'d like to book!',
        timestamp: new Date()
      }]);
    }
  }, []);

  /**
   * Send message to LLM service and process response
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message to chat
    const newUserMessage = {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Call LLM service
      const response = await fetch('http://localhost:7001/api/llm/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      if (data.success) {
        // Process the LLM response
        processLLMResponse(data.data);
      } else {
        addAssistantMessage('Sorry, I encountered an error processing your request. Please try again.');
      }
    } catch (error) {
      console.error('Error calling LLM service:', error);
      addAssistantMessage('Failed to connect to the AI service. Please check if the service is running.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Process the LLM response and display results
   */
  const processLLMResponse = (llmData) => {
    console.log('LLM Response:', llmData);

    // Check if there are foundEvents from the search
    if (llmData.foundEvents && llmData.foundEvents.length > 0) {
      const assistantMessage = {
        type: 'assistant',
        content: llmData.text || 'I found these events for you:',
        events: llmData.foundEvents,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      return;
    }

    // If no events found, just display the text response
    if (llmData.text) {
      addAssistantMessage(llmData.text);
    } else {
      addAssistantMessage('I processed your request but couldn\'t find any specific events. Can you be more specific?');
    }
  };

  /**
   * Add a simple assistant message
   */
  const addAssistantMessage = (content) => {
    const assistantMessage = {
      type: 'assistant',
      content: content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);
  };

  /**
   * Handle ticket purchase from chat
   */
  const handlePurchase = async (eventId, eventName, ticketCount = 1) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:6001/api/events/${eventId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketCount })
      });

      const data = await response.json();

      if (data.success) {
        addAssistantMessage(`✅ Successfully purchased ${ticketCount} ticket(s) for ${eventName}!`);
        
        // Notify parent component to refresh events
        if (onPurchase) {
          onPurchase(eventId, data.event);
        }
      } else {
        addAssistantMessage(`❌ ${data.message || 'Failed to purchase ticket'}`);
      }
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      addAssistantMessage('❌ Failed to connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Enter key press to send message
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        className={`chat-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Sidebar */}
      <div className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>🐅 TigerTickets AI</h3>
          <p>Ask me about events!</p>
        </div>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.type}`}>
              <div className="message-content">
                {msg.content}
              </div>
              
              {/* Display event results with purchase buttons */}
              {msg.events && msg.events.length > 0 && (
                <div className="event-results">
                  {msg.events.map((event) => (
                    <div key={event.event_id} className="event-card">
                      <div className="event-card-header">
                        <strong>{event.name}</strong>
                      </div>
                      <div className="event-card-body">
                        <p className="event-date">📅 {new Date(event.date).toLocaleDateString()}</p>
                        <p className="event-tickets">
                          🎟️ {event.tickets_available} tickets available
                        </p>
                      </div>
                      <button
                        className="purchase-button"
                        onClick={() => handlePurchase(event.event_id, event.name, 1)}
                        disabled={event.tickets_available === 0 || isLoading}
                      >
                        {event.tickets_available === 0 ? 'Sold Out' : 'Purchase Ticket'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <span className="message-timestamp">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))}
          
          {isLoading && (
            <div className="chat-message assistant">
              <div className="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about events..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
}

export default ChatSidebar;
