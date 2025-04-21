import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';

// Mock the fetch function
global.fetch = jest.fn();

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Wrap component with router context
const LoginPageWithRouter = () => (
  <BrowserRouter>
    <LoginPage />
  </BrowserRouter>
);

test('renders login form with email and password inputs', () => {
  render(<LoginPageWithRouter />);
  
  // Check if form elements exist
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

test('shows error message when login fails', async () => {
  // Mock a failed API response
  global.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ message: 'Invalid email or password' }),
  });
  
  render(<LoginPageWithRouter />);
  
  // Fill the form
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'wrongpassword' },
  });
  
  // Submit the form
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  // Wait for error message to appear
  const errorMessage = await screen.findByText(/invalid email or password/i);
  expect(errorMessage).toBeInTheDocument();
});

test('calls fetch with correct data on form submission', () => {
  render(<LoginPageWithRouter />);
  
  // Fill the form
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'test123' },
  });
  
  // Submit the form
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  // Verify fetch was called with correct parameters
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123',
      }),
    })
  );
});