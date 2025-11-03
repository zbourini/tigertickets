import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusMessage from '../StatusMessage';

describe('StatusMessage Component', () => {
    test('displays success message with green styling', () => {
        render(<StatusMessage message="Success! Purchase successful" />);
        
        const message = screen.getByText(/Purchase successful/i);
        expect(message).toBeInTheDocument();
        expect(message).toHaveClass(/success|green/i);
    });

    test('displays error message with red styling', () => {
        render(<StatusMessage message="Error: Purchase failed" />);
        
        const message = screen.getByText(/Purchase failed/i);
        expect(message).toBeInTheDocument();
        expect(message).toHaveClass(/error|red/i);
    });

    test('hides when message is empty string', () => {
        const { container } = render(<StatusMessage message="" />);
        
        expect(container.firstChild).toBeNull();
    });

    test('hides when message is null', () => {
        const { container } = render(<StatusMessage message={null} />);
        
        expect(container.firstChild).toBeNull();
    });

    test('hides when message is undefined', () => {
        const { container } = render(<StatusMessage message={undefined} />);
        
        expect(container.firstChild).toBeNull();
    });

    test('displays long messages correctly', () => {
        const longMessage = "This is a very long status message that should still be displayed correctly without breaking the layout or causing any issues.";
        render(<StatusMessage message={longMessage} />);
        
        expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    test('preserves emoji in messages', () => {
        render(<StatusMessage message="✅ Success!" />);
        
        expect(screen.getByText(/✅ Success!/i)).toBeInTheDocument();
    });

    test('has appropriate ARIA role for accessibility', () => {
        render(<StatusMessage message="Test message" />);
        
        const message = screen.getByText(/Test message/i);
        expect(message).toHaveAttribute('role', 'alert');
    });
});
