import type {
  InvoiceDetail,
  InvoiceDraftInput,
  InvoiceEmailLog,
  InvoiceEmailPayload
} from '../types';
import { fetchBlob, fetchJson } from './httpClient';

type InvoiceListResponse = {
  data: InvoiceDetail[];
};

type InvoiceResponse = {
  data: InvoiceDetail;
};

type InvoiceEmailResponse = {
  data: InvoiceEmailLog;
};

export async function getInvoices() {
  const response = await fetchJson<InvoiceListResponse>('/invoices');
  return response.data;
}

export async function getInvoice(id: number) {
  const response = await fetchJson<InvoiceResponse>(`/invoices/${id}`);
  return response.data;
}

export async function createInvoice(input: InvoiceDraftInput) {
  const response = await fetchJson<InvoiceResponse>('/invoices', {
    method: 'POST',
    json: input
  });

  return response.data;
}

export async function updateInvoice(id: number, input: InvoiceDraftInput) {
  const response = await fetchJson<InvoiceResponse>(`/invoices/${id}`, {
    method: 'PUT',
    json: input
  });

  return response.data;
}

export async function downloadInvoicePdf(id: number) {
  return fetchBlob(`/invoices/${id}/pdf`);
}

export async function sendInvoiceEmail(id: number, payload: InvoiceEmailPayload) {
  const response = await fetchJson<InvoiceEmailResponse>(`/invoices/${id}/email`, {
    method: 'POST',
    json: payload
  });

  return response.data;
}
