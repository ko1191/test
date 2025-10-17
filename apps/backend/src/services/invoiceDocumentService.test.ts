import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInvoiceFixture } from '../__fixtures__/invoiceFixture';
import {
  ensureInvoicePdf,
  generateInvoicePdf,
  getInvoicePdfDirectory,
  getInvoicePdfDownloadName,
  getInvoicePdfPath
} from './invoiceDocumentService';
import invoicePdfStrings from '../__fixtures__/invoicePdfStrings.json';

let originalStorageEnv: string | undefined;
let tempStorageDir: string;

beforeEach(async () => {
  originalStorageEnv = process.env.INVOICE_PDF_DIR;
  tempStorageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'invoice-documents-'));
  process.env.INVOICE_PDF_DIR = tempStorageDir;
});

afterEach(async () => {
  if (originalStorageEnv === undefined) {
    delete process.env.INVOICE_PDF_DIR;
  } else {
    process.env.INVOICE_PDF_DIR = originalStorageEnv;
  }

  await fs.rm(tempStorageDir, { recursive: true, force: true });
});

describe('invoiceDocumentService', () => {
  it('generates a pdf document with invoice details', async () => {
    const invoice = createInvoiceFixture();
    const documentBuffer = await generateInvoicePdf(invoice);
    const content = documentBuffer.toString('latin1');

    expect(documentBuffer).toBeInstanceOf(Buffer);
    expect(documentBuffer.length).toBeGreaterThan(0);

    invoicePdfStrings.forEach((snippet) => {
      expect(content).toContain(snippet);
    });
  });

  it('writes the generated pdf to the configured storage directory', async () => {
    const invoice = createInvoiceFixture();
    const expectedDirectory = getInvoicePdfDirectory();
    const expectedPath = getInvoicePdfPath(invoice);

    expect(expectedDirectory.startsWith(tempStorageDir)).toBe(true);

    const storedPath = await ensureInvoicePdf(invoice);
    const fileContents = await fs.readFile(storedPath);

    expect(storedPath).toBe(expectedPath);
    expect(fileContents.length).toBeGreaterThan(0);

    // Ensure existing documents are reused without regeneration
    const sentinel = Buffer.from('existing-pdf');
    await fs.writeFile(storedPath, sentinel);

    const reusedPath = await ensureInvoicePdf(invoice);
    const reusedContents = await fs.readFile(reusedPath);

    expect(reusedPath).toBe(storedPath);
    expect(reusedContents.equals(sentinel)).toBe(true);
  });

  it('sanitizes invoice numbers when computing filenames', () => {
    const invoice = createInvoiceFixture();
    invoice.invoiceNumber = 'INV/2024 001#Draft';

    const filePath = getInvoicePdfPath(invoice);
    const downloadName = getInvoicePdfDownloadName(invoice);

    expect(filePath).toMatch(/invoice-1-inv-2024-001-draft\.pdf$/);
    expect(downloadName).toBe('inv-2024-001-draft.pdf');
  });
});
