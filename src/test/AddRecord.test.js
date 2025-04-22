import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import AddRecordPage from '../AddRecordPage';
import '@testing-library/jest-dom';

global.fetch = jest.fn();

const renderWithRouter = (catId = '123') => {
  window.localStorage.setItem('token', 'fake-token'); // mock token
  render(
    <MemoryRouter initialEntries={[`/cats/${catId}/records/add`]}>
      <Routes>
        <Route path="/cats/:id/records/add" element={<AddRecordPage />} />
      </Routes>
    </MemoryRouter>
  );
};

test('submits form with health record info', async () => {
  // Mock GET cat info
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id: 123, name: 'Stitch' }),
  });

  // Mock POST health record
  fetch.mockResolvedValueOnce({ ok: true });

  renderWithRouter();

  // Load cat
  await screen.findByText(/add health record for Stitch/i);

  fireEvent.change(screen.getByLabelText(/record type/i), {
    target: { value: 'checkup' },
  });
  fireEvent.change(screen.getByLabelText(/date/i), {
    target: { value: '2025-04-22' },
  });
  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Routine check-up' },
  });
  fireEvent.change(screen.getByLabelText(/notes/i), {
    target: { value: 'Everything is normal' },
  });

  // mock file upload
  const file = new File(['hello'], 'checkup.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText(/upload file/i), {
    target: { files: [file] },
  });

  fireEvent.click(screen.getByRole('button', { name: /add record/i }));

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledTimes(2); 
    expect(fetch.mock.calls[1][0]).toMatch(/\/records$/);
    const formData = fetch.mock.calls[1][1].body;
    expect(formData instanceof FormData).toBe(true);
    expect(formData.get('type')).toBe('checkup');
    expect(formData.get('description')).toBe('Routine check-up');
  });
});
