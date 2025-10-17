import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClientsListPage from './ClientsListPage';

const createMockResponse = (
  body: unknown,
  init: { ok?: boolean; status?: number; statusText?: string } = {}
) => {
  const json = () => Promise.resolve(body);
  const text = () =>
    Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body));

  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    json,
    text,
    clone() {
      return createMockResponse(body, init);
    }
  } as Response;
};

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={['/clients']}>
      <Routes>
        <Route path="/clients" element={<ClientsListPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ClientsListPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders client data from the API', async () => {
    const mockClients = [
      {
        id: 1,
        name: 'Acme Corp',
        email: 'hello@acme.com',
        phone: '123-456-7890',
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        postalCode: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        invoices: []
      }
    ];

    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({ data: mockClients })
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/clients'),
      expect.any(Object)
    );
    expect(screen.getByRole('link', { name: /new client/i })).toBeInTheDocument();
  });

  it('displays an error message when the API request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({ message: 'Failed to load clients' }, {
        ok: false,
        status: 500,
        statusText: 'Server Error'
      })
    );

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithRouter();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Failed to load clients');
  });
});
