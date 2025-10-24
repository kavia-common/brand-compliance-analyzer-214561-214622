import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header brand', () => {
  render(<App />);
  const header = screen.getByText(/Brand Compliance Analyzer/i);
  expect(header).toBeInTheDocument();
});
