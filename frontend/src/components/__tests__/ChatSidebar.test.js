/**
 * ChatSidebar Component Tests
 * 
 * Tests for the ChatSidebar component including rendering,
 * message sending, event display, and ticket purchasing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatSidebar from '../ChatSidebar';
import { setupFetchMock } from '../../testUtils';

describe('ChatSidebar Component', () => {
  let fetchMock;
  
  beforeEach(() => {
    fetchMock = setupFetchMock();
    // Suppress expected console logs/warnings
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock speech synthesis and recognition APIs
    global.SpeechSynthesisUtterance = jest.fn();
    global.speechSynthesis = {
      speak: jest.fn(),
      cancel: jest.fn(),
      speaking: false
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders chat toggle button', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('Chat');
    });

    test('opens chat sidebar when toggle button is clicked', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('TigerTickets AI')).toBeInTheDocument();
      expect(screen.getByText('Ask me about events!')).toBeInTheDocument();
    });

    test('displays welcome message on mount', async () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Hi! I'm TigerTickets AI/i)).toBeInTheDocument();
      });
    });

    test('closes chat sidebar when toggle button is clicked again', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const closeButton = screen.getByRole('button', { name: /close chat/i });
      expect(closeButton).toHaveTextContent('X');
      
      fireEvent.click(closeButton);
      expect(toggleButton).toHaveTextContent('Chat');
    });
  });

  describe('Message Input', () => {
    test('renders message input field', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      expect(screen.getByPlaceholderText(/Ask about events/i)).toBeInTheDocument();
    });

    test('updates input value when typing', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      fireEvent.change(input, { target: { value: 'basketball game' } });
      
      expect(input).toHaveValue('basketball game');
    });

    test('send button is disabled when input is empty', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    test('send button is enabled when input has text', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      fireEvent.change(input, { target: { value: 'basketball' } });
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Message Sending', () => {
    test('sends message when send button is clicked', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Here are some basketball games',
          foundEvents: []
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'basketball game' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('basketball game')).toBeInTheDocument();
      });
    });

    test('clears input after sending message', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Here are some events',
          foundEvents: []
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'concert' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('sends message when Enter key is pressed', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Response text',
          foundEvents: []
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      
      fireEvent.change(input, { target: { value: 'test message' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
      
      await waitFor(() => {
        expect(screen.getByText('test message')).toBeInTheDocument();
      });
    });

    test('does not send empty message', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(sendButton);
      
      // Should not make any fetch call
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('LLM Response Handling', () => {
    test('displays assistant response with text only', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'I found these events for you',
          foundEvents: []
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'show events' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('I found these events for you')).toBeInTheDocument();
      });
    });

    test('displays events when LLM returns foundEvents', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Here are some basketball games',
          foundEvents: [
            {
              event_id: 1,
              name: 'Basketball Game',
              date: '2025-12-15',
              tickets_available: 100
            },
            {
              event_id: 2,
              name: 'Championship Game',
              date: '2025-12-20',
              tickets_available: 50
            }
          ]
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'basketball' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Basketball Game')).toBeInTheDocument();
        expect(screen.getByText('Championship Game')).toBeInTheDocument();
        expect(screen.getByText('100 tickets available')).toBeInTheDocument();
        expect(screen.getByText('50 tickets available')).toBeInTheDocument();
      });
    });

    test('displays error message on LLM service failure', async () => {
      fetchMock.mockError({ message: 'Service unavailable' });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/i)).toBeInTheDocument();
      });
    });

    test('displays network error message on fetch failure', async () => {
      fetchMock.mockNetworkError();

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to connect to the AI service/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading indicator while processing message', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Response',
          foundEvents: []
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(sendButton);
      
      // Check for typing indicator
      const typingIndicator = document.querySelector('.typing-indicator');
      expect(typingIndicator).toBeInTheDocument();
    });

    test('disables input and buttons while loading', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Response',
          foundEvents: []
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.click(sendButton);
      
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('Ticket Purchase', () => {
    test('displays purchase buttons for events with available tickets', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Found events',
          foundEvents: [
            {
              event_id: 1,
              name: 'Concert',
              date: '2025-12-15',
              tickets_available: 50
            }
          ]
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      fireEvent.change(input, { target: { value: 'concert' } });
      fireEvent.click(screen.getByRole('button', { name: /send message/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Purchase Ticket')).toBeInTheDocument();
      });
    });

    test('shows sold out for events with no tickets', async () => {
      fetchMock.mockSuccess({
        data: {
          text: 'Found events',
          foundEvents: [
            {
              event_id: 1,
              name: 'Sold Out Concert',
              date: '2025-12-15',
              tickets_available: 0
            }
          ]
        }
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      fireEvent.change(input, { target: { value: 'concert' } });
      fireEvent.click(screen.getByRole('button', { name: /send message/i }));
      
      await waitFor(() => {
        const soldOutButton = screen.getByText('Sold Out');
        expect(soldOutButton).toBeInTheDocument();
        expect(soldOutButton).toBeDisabled();
      });
    });

    test('purchases ticket successfully', async () => {
      // Mock LLM response
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            text: 'Found events',
            foundEvents: [
              {
                event_id: 1,
                name: 'Concert',
                date: '2025-12-15',
                tickets_available: 50
              }
            ]
          }
        })
      });

      // Mock purchase response
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          success: true,
          event: { tickets_available: 49 }
        })
      });

      const mockOnPurchase = jest.fn();
      render(<ChatSidebar onPurchase={mockOnPurchase} />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      fireEvent.change(input, { target: { value: 'concert' } });
      fireEvent.click(screen.getByRole('button', { name: /send message/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Purchase Ticket')).toBeInTheDocument();
      });
      
      const purchaseButton = screen.getByText('Purchase Ticket');
      fireEvent.click(purchaseButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Successfully purchased 1 ticket/i)).toBeInTheDocument();
      });
      
      expect(mockOnPurchase).toHaveBeenCalledWith(1, expect.anything());
    });

    test('displays error message on purchase failure', async () => {
      // Mock LLM response
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            text: 'Found events',
            foundEvents: [
              {
                event_id: 1,
                name: 'Concert',
                date: '2025-12-15',
                tickets_available: 50
              }
            ]
          }
        })
      });

      // Mock purchase failure
      global.fetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          success: false,
          message: 'Not enough tickets available'
        })
      });

      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText(/Ask about events/i);
      fireEvent.change(input, { target: { value: 'concert' } });
      fireEvent.click(screen.getByRole('button', { name: /send message/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Purchase Ticket')).toBeInTheDocument();
      });
      
      const purchaseButton = screen.getByText('Purchase Ticket');
      fireEvent.click(purchaseButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Not enough tickets available/i)).toBeInTheDocument();
      });
    });
  });

  describe('Voice Input', () => {
    test('renders microphone button', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      expect(screen.getByRole('button', { name: /voice input/i })).toBeInTheDocument();
    });

    test('microphone button is disabled when speech not supported', () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      const micButton = screen.getByTitle(/Voice input not supported/i);
      expect(micButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('has accessible labels for all interactive elements', () => {
      render(<ChatSidebar />);
      
      expect(screen.getByRole('button', { name: /open chat/i })).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole('button', { name: /open chat/i }));
      
      expect(screen.getByRole('button', { name: /close chat/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    test('displays timestamps for messages', async () => {
      render(<ChatSidebar />);
      
      const toggleButton = screen.getByRole('button', { name: /open chat/i });
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const timestamps = document.querySelectorAll('.message-timestamp');
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });
  });
});
