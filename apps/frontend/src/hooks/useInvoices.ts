import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createInvoice,
  downloadInvoicePdf,
  getInvoice,
  getInvoices,
  sendInvoiceEmail,
  updateInvoice
} from '../api/invoices';
import { ApiError } from '../api/httpClient';
import type {
  InvoiceDetail,
  InvoiceDraftInput,
  InvoiceEmailLog,
  InvoiceEmailPayload
} from '../types';

type MutationStatus = 'idle' | 'loading' | 'success' | 'error';

type MutationResult<T> = {
  status: MutationStatus;
  error: string | null;
  reset: () => void;
  execute: T;
};

function useMutationHandler<Args extends unknown[], Return>(
  mutate: (...args: Args) => Promise<Return>
): MutationResult<(...args: Args) => Promise<Return>> {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: Args) => {
      setStatus('loading');
      setError(null);

      try {
        const result = await mutate(...args);
        setStatus('success');
        return result;
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'The operation could not be completed. Please try again.';
        setStatus('error');
        setError(message);
        throw error;
      }
    },
    [mutate]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, execute, reset };
}

export function useInvoicesList() {
  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'We were unable to load invoices. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  return useMemo(
    () => ({ invoices, loading, error, refresh: fetchInvoices }),
    [invoices, loading, error, fetchInvoices]
  );
}

export function useInvoice(id?: number) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) {
      setInvoice(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getInvoice(id);
      setInvoice(data);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'We were unable to load the invoice. Please try again.';
      setError(message);
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchInvoice();
  }, [fetchInvoice]);

  return useMemo(
    () => ({ invoice, loading, error, refresh: fetchInvoice }),
    [invoice, loading, error, fetchInvoice]
  );
}

export function useInvoiceMutations() {
  const create = useMutationHandler((input: InvoiceDraftInput) => createInvoice(input));
  const update = useMutationHandler((id: number, input: InvoiceDraftInput) =>
    updateInvoice(id, input)
  );

  return {
    createInvoice: create.execute,
    updateInvoice: update.execute,
    createStatus: create.status,
    createError: create.error,
    resetCreate: create.reset,
    updateStatus: update.status,
    updateError: update.error,
    resetUpdate: update.reset
  };
}

export function useInvoiceEmail(id: number | undefined) {
  const mutation = useMutationHandler(
    (payload: InvoiceEmailPayload): Promise<InvoiceEmailLog> => {
      if (!id) {
        return Promise.reject(
          new ApiError(400, 'Invoice ID is required before sending email')
        );
      }

      return sendInvoiceEmail(id, payload);
    }
  );

  return {
    sendEmail: mutation.execute,
    status: mutation.status,
    error: mutation.error,
    reset: mutation.reset
  };
}

export function useInvoicePdf(id: number | undefined) {
  const mutation = useMutationHandler(async () => {
    if (!id) {
      throw new ApiError(400, 'Invoice ID is required to download a PDF');
    }

    return downloadInvoicePdf(id);
  });

  return {
    download: mutation.execute,
    status: mutation.status,
    error: mutation.error,
    reset: mutation.reset
  };
}
