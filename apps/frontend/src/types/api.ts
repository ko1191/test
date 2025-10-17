export interface InvoiceStatus {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  clientId: number;
  invoiceStatusId: number;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  subtotal: string;
  tax: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceClientSummary {
  id: number;
  name: string;
  email: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  client: InvoiceClientSummary;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
  invoices?: InvoiceSummary[];
}

export type ClientInput = {
  name: string;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

export type InvoiceLineItemInput = {
  description: string;
  quantity: number;
  unitPrice: string;
};

export type InvoiceDraftInput = {
  invoiceNumber: string;
  clientId: number;
  statusCode?: string;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  lineItems: InvoiceLineItemInput[];
  taxRate?: string;
};

export interface InvoiceEmailPayload {
  template?: 'invoice-issued' | 'invoice-reminder';
  recipientEmail?: string;
  message?: string;
}

export interface InvoiceEmailLog {
  id: number;
  invoiceId: number;
  recipientEmail: string;
  templateName: 'invoice-issued' | 'invoice-reminder';
  subject: string;
  messageId: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}
