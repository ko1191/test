import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import type { InvoiceWithRelations } from '../repositories/invoiceRepository';

const DEFAULT_STORAGE_SUBDIRECTORY = ['storage', 'invoices'] as const;

const sanitizeFileSegment = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const toNumeric = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return Number.parseFloat((value as { toString: () => string }).toString());
  }

  return NaN;
};

const formatCurrency = (value: unknown) => {
  const numeric = toNumeric(value);
  const safeNumber = Number.isFinite(numeric) ? numeric : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(safeNumber);
};

const getConfiguredStorageDirectory = () => {
  const configured = process.env.INVOICE_PDF_DIR;

  if (configured && configured.trim().length > 0) {
    return path.resolve(configured);
  }

  return path.resolve(process.cwd(), ...DEFAULT_STORAGE_SUBDIRECTORY);
};

const createPdfDocument = (invoice: InvoiceWithRelations) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  const issueDate = invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate);
  const updatedAt = invoice.updatedAt instanceof Date ? invoice.updatedAt : new Date(invoice.updatedAt);

  doc.info.Title = `Invoice ${invoice.invoiceNumber}`;
  doc.info.Subject = `Invoice ${invoice.invoiceNumber}`;
  doc.info.Author = 'Invoicing System';
  doc.info.Creator = 'Invoicing System';
  doc.info.Producer = 'Invoicing System';
  doc.info.CreationDate = issueDate;
  doc.info.ModDate = updatedAt;

  return doc;
};

const drawHeader = (doc: PDFKit.PDFDocument, invoice: InvoiceWithRelations) => {
  doc.font('Helvetica-Bold').fontSize(26).text('Invoice', { align: 'right' });
  doc.moveDown(1);

  doc.font('Helvetica').fontSize(12);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`);
  doc.moveDown(1.5);
};

const drawClientDetails = (doc: PDFKit.PDFDocument, invoice: InvoiceWithRelations) => {
  doc.font('Helvetica-Bold').fontSize(12).text('Bill To');
  doc.font('Helvetica').text(invoice.client.name);
  doc.text(invoice.client.email);
  doc.moveDown(1.5);
};

const drawLineItems = (doc: PDFKit.PDFDocument, invoice: InvoiceWithRelations) => {
  const startY = doc.y;

  doc.font('Helvetica-Bold');
  doc.text('Description', 50, startY, { width: 260 });
  doc.text('Qty', 320, startY, { width: 60, align: 'right' });
  doc.text('Unit Price', 390, startY, { width: 90, align: 'right' });
  doc.text('Line Total', 490, startY, { width: 90, align: 'right' });

  const separatorY = startY + 15;

  doc.moveTo(50, separatorY).lineTo(550, separatorY).stroke();
  doc.font('Helvetica');

  invoice.lineItems.forEach((item, index) => {
    const rowTop = separatorY + 10 + index * 20;

    doc.text(item.description, 50, rowTop, { width: 260 });
    doc.text(`${item.quantity}`, 320, rowTop, { width: 60, align: 'right' });
    doc.text(formatCurrency(item.unitPrice), 390, rowTop, {
      width: 90,
      align: 'right'
    });
    doc.text(formatCurrency(item.lineTotal), 490, rowTop, {
      width: 90,
      align: 'right'
    });
  });

  doc.moveDown(2);
};

const drawTotals = (doc: PDFKit.PDFDocument, invoice: InvoiceWithRelations) => {
  const tableTop = doc.y;

  doc.moveTo(350, tableTop).lineTo(550, tableTop).stroke();

  const totalsY = tableTop + 10;

  doc.font('Helvetica');
  doc.text('Subtotal', 370, totalsY, { width: 90, align: 'right' });
  doc.text(formatCurrency(invoice.subtotal), 470, totalsY, {
    width: 70,
    align: 'right'
  });

  doc.text('Tax', 370, totalsY + 20, { width: 90, align: 'right' });
  doc.text(formatCurrency(invoice.tax), 470, totalsY + 20, { width: 70, align: 'right' });

  doc.font('Helvetica-Bold');
  doc.text('Total', 370, totalsY + 40, { width: 90, align: 'right' });
  doc.text(formatCurrency(invoice.total), 470, totalsY + 40, {
    width: 70,
    align: 'right'
  });

  doc.moveDown(2);

  if (invoice.notes) {
    doc.font('Helvetica-Bold').text('Notes');
    doc.font('Helvetica').text(invoice.notes);
    doc.moveDown(1);
  }
};

export async function generateInvoicePdf(
  invoice: InvoiceWithRelations
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createPdfDocument(invoice);
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on('error', (error) => {
      reject(error);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    drawHeader(doc, invoice);
    drawClientDetails(doc, invoice);
    drawLineItems(doc, invoice);
    drawTotals(doc, invoice);

    doc.end();
  });
}

export function getInvoicePdfDirectory() {
  return getConfiguredStorageDirectory();
}

export function getInvoicePdfPath(invoice: InvoiceWithRelations) {
  const directory = getConfiguredStorageDirectory();
  const fileName = (() => {
    const sanitizedInvoiceNumber = sanitizeFileSegment(invoice.invoiceNumber);

    if (sanitizedInvoiceNumber) {
      return `invoice-${invoice.id}-${sanitizedInvoiceNumber}.pdf`;
    }

    return `invoice-${invoice.id}.pdf`;
  })();

  return path.join(directory, fileName);
}

export function getInvoicePdfDownloadName(invoice: InvoiceWithRelations) {
  const sanitizedInvoiceNumber = sanitizeFileSegment(invoice.invoiceNumber);

  if (sanitizedInvoiceNumber) {
    return `${sanitizedInvoiceNumber}.pdf`;
  }

  return `invoice-${invoice.id}.pdf`;
}

export async function ensureInvoicePdf(invoice: InvoiceWithRelations) {
  const directory = getConfiguredStorageDirectory();
  await fs.mkdir(directory, { recursive: true });

  const filePath = getInvoicePdfPath(invoice);

  try {
    await fs.access(filePath, fsConstants.R_OK);
    return filePath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const buffer = await generateInvoicePdf(invoice);
  await fs.writeFile(filePath, buffer);

  return filePath;
}
