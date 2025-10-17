import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClientFormPage from './ClientFormPage';

describe('ClientFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithRouter = () =>
    render(
      <MemoryRouter initialEntries={['/clients/new']}>
        <Routes>
          <Route path="/clients/new" element={<ClientFormPage />} />
          <Route path="/clients/:clientId" element={<ClientFormPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('validates required fields before submitting', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithRouter();

    await userEvent.click(screen.getByRole('button', { name: /save client/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('creates a new client and navigates to the detail page', async () => {
    const createdClient = {
      id: 1,
      name: 'Acme Corp',
      email: 'hello@acme.com',
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invoices: []
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ data: createdClient })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { ...createdClient, invoices: [] } })
      } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithRouter();

    await userEvent.type(screen.getByLabelText(/^name/i), 'Acme Corp');
    await userEvent.type(screen.getByLabelText(/^email/i), 'hello@acme.com');

    await userEvent.click(screen.getByRole('button', { name: /save client/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const postCall = fetchMock.mock.calls[0];
    expect(postCall[0]).toContain('/clients');
    expect(postCall[1]?.method).toBe('POST');
    expect(postCall[1]?.body).toBe(JSON.stringify({
      name: 'Acme Corp',
      email: 'hello@acme.com',
      phone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null
    }));

    expect(await screen.findByText('Client created successfully.')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
    });
  });
});
