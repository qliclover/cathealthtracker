import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CatListPage from '../CatListPage';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch function
global.fetch = jest.fn();

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Wrap component with router context
const CatListPageWithRouter = () => (
  <BrowserRouter>
    <CatListPage />
  </BrowserRouter>
);

test('shows loading spinner initially', () => {
  // Mock localStorage to return a token
  localStorageMock.getItem.mockReturnValue('fake-token');
  
  // Mock fetch to return a never-resolving Promise to keep loading state
  global.fetch.mockImplementationOnce(() => new Promise(() => {}));
  
  render(<CatListPageWithRouter />);
  
  // Check if loading spinner is displayed
  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('displays empty state message when no cats', async () => {
  // Mock localStorage to return a token
  localStorageMock.getItem.mockReturnValue('fake-token');
  
  // Mock successful API response but with empty array
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [],
  });
  
  render(<CatListPageWithRouter />);
  
  // Wait for empty state message to appear
  const emptyMessage = await screen.findByText(/you haven't added any cats yet/i);
  expect(emptyMessage).toBeInTheDocument();
});

test('displays cats when API returns data', async () => {
  // Mock localStorage to return a token
  localStorageMock.getItem.mockReturnValue('fake-token');
  
  // Mock API response with two cats
  const mockCats = [
    { id: 1, name: 'Fluffy', breed: 'Persian', age: 3, weight: 4.5 },
    { id: 2, name: 'Whiskers', breed: 'Siamese', age: 2, weight: 3.8 },
  ];
  
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockCats,
  });
  
  render(<CatListPageWithRouter />);
  
  // Wait for cat names to appear
  await waitFor(() => {
    expect(screen.getByText('Fluffy')).toBeInTheDocument();
    expect(screen.getByText('Whiskers')).toBeInTheDocument();
  });
  
  // Check cat details
  expect(screen.getByText('Persian')).toBeInTheDocument();
  expect(screen.getByText('Siamese')).toBeInTheDocument();
});