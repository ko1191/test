import type { Client, ClientInput } from '../types';
import { fetchJson } from './httpClient';

type ClientListResponse = {
  data: Client[];
};

type ClientResponse = {
  data: Client;
};

export async function getClients(withRelations = false) {
  const query = withRelations ? '?withRelations=true' : '';
  const response = await fetchJson<ClientListResponse>(`/clients${query}`);
  return response.data;
}

export async function getClient(id: number, withRelations = false) {
  const query = withRelations ? '?withRelations=true' : '';
  const response = await fetchJson<ClientResponse>(`/clients/${id}${query}`);
  return response.data;
}

export async function createClient(input: ClientInput) {
  const response = await fetchJson<ClientResponse>(`/clients`, {
    method: 'POST',
    json: input
  });

  return response.data;
}

export async function updateClient(id: number, input: ClientInput) {
  const response = await fetchJson<ClientResponse>(`/clients/${id}`, {
    method: 'PUT',
    json: input
  });

  return response.data;
}
