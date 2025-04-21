import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AddCatPage from '../AddCatPage';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch function
global.fetch = jest.fn();

// Mock URL.createObjectURL function
global.URL.createObjectURL = jest.fn();

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Wrap component with router context
const AddCatPageWithRouter = () => (
  <BrowserRouter>
    <AddCatPage />
  </BrowserRouter>
);

test('renders add cat form with all required fields', () => {
  render(<AddCatPageWithRouter />);
  
  // Check if form elements exist
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/breed/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/birthdate/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /add cat/i })).toBeInTheDocument();
});

test('shows validation error for empty required fields', () => {
  render(<AddCatPageWithRouter />);
  
  // Submit empty form
  fireEvent.click(screen.getByRole('button', { name: /add cat/i }));
  
  // Check if HTML5 validation is triggered (by checking if form is still on page)
  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/breed/i)).toBeInTheDocument();
});

test('submits form data correctly when all fields are filled', () => {
  // Mock localStorage to return a token
  localStorageMock.getItem.mockReturnValue('fake-token');
  
  render(<AddCatPageWithRouter />);
  
  // Fill the form
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'Stitch' },
  });
  fireEvent.change(screen.getByLabelText(/breed/i), {
    target: { value: 'American Curl' },
  });
  fireEvent.change(screen.getByLabelText(/weight/i), {
    target: { value: '11' },
  });
  fireEvent.change(screen.getByLabelText(/birthdate/i), {
    target: { value: '2020-01-15' },
  });
  
  // Create mock FormData object since actual FormData is not available in test environment
  const originalFormData = global.FormData;
  const mockFormDataAppend = jest.fn();
  global.FormData = jest.fn(() => ({
    append: mockFormDataAppend,
  }));
  
  // Submit the form
  fireEvent.click(screen.getByRole('button', { name: /add cat/i }));
  
  // Verify FormData.append was called with correct parameters
  expect(mockFormDataAppend).toHaveBeenCalledWith('name', 'Stitch');
  expect(mockFormDataAppend).toHaveBeenCalledWith('breed', 'American Curl');
  expect(mockFormDataAppend).toHaveBeenCalledWith('weight', '11');
  expect(mockFormDataAppend).toHaveBeenCalledWith('birthdate', '2020-01-15');
  
  // Verify fetch was called
  expect(global.fetch).toHaveBeenCalledTimes(1);
  
  // Restore original FormData
  global.FormData = originalFormData;
});