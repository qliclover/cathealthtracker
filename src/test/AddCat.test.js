import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AddCatPage from '../AddCatPage';
import '@testing-library/jest-dom';

global.fetch = jest.fn();

const renderWithRouter = () => {
  localStorage.setItem('token', 'test-token');

  render(
    <MemoryRouter initialEntries={['/cats/add']}>
      <Routes>
        <Route path="/cats/add" element={<AddCatPage />} />
        <Route path="/cats" element={<div>Cat List Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

test('submits form and navigates on success', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id: 1, name: 'Whiskers' })
  });

  renderWithRouter();

  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Stitch' } });
  fireEvent.change(screen.getByLabelText(/breed/i), { target: { value: 'American Curl' } });
  fireEvent.change(screen.getByLabelText(/birthdate/i), { target: { value: '2020-01-01' } });
  fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '11' } });

  // mock file input
  const file = new File(['(⌐□_□)'], 'cat.jpg', { type: 'image/jpeg' });
  fireEvent.change(screen.getByLabelText(/cat photo/i), {
    target: { files: [file] }
  });

  fireEvent.click(screen.getByRole('button', { name: /add cat/i }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(1);
    const formData = fetch.mock.calls[0][1].body;
    expect(formData instanceof FormData).toBe(true);
    expect(formData.get('name')).toBe('Stitch');
    expect(formData.get('weight')).toBe('11');
    expect(formData.get('image')).toBe(file);
  });

  // Wait for redirect
  await screen.findByText(/cat list page/i);
});
