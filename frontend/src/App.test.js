import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main app header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Clemson Campus Events/i);
  expect(headerElement).toBeInTheDocument();
});
