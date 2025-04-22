import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';
import '@testing-library/jest-dom';

global.fetch = jest.fn();

const RegisterPageWithRouter = () => (
  <BrowserRouter>
    <RegisterPage />
  </BrowserRouter>
);

test('registers user and stores token', async () => {
  // mock fetch return
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ token: 'test-token', user: { id: 1, name: 'Test', email: 'test@example.com' } })
  });

  const mockSetItem = jest.fn();
  Object.defineProperty(window, 'localStorage', {
    value: { setItem: mockSetItem },
    writable: true
  });

  render(<RegisterPageWithRouter />);

  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '12345678' } });

  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith('token', 'test-token');
  });
});
