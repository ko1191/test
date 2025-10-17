import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Client, ClientInput } from '../types';
import { createClient, getClient, getClients, updateClient } from '../api/clients';
import { ApiError } from '../api/httpClient';

type MutationStatus = 'idle' | 'loading' | 'success' | 'error';

type MutationResult<T> = {
  status: MutationStatus;
  error: string | null;
  reset: () => void;
  execute: T;
};

const initialClientInput: ClientInput = {
  name: '',
  email: ''
};

type UseClientOptions = {
  withRelations?: boolean;
};

const normalizeClientInput = (input: ClientInput): ClientInput => {
  const normalized: ClientInput = { ...initialClientInput, ...input };

  return {
    ...normalized,
    phone: normalized.phone ?? null,
    addressLine1: normalized.addressLine1 ?? null,
    addressLine2: normalized.addressLine2 ?? null,
    city: normalized.city ?? null,
    state: normalized.state ?? null,
    postalCode: normalized.postalCode ?? null
  };
};

export function useClientsList(withRelations = false) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getClients(withRelations);
      setClients(data);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'We were unable to load clients. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [withRelations]);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  return useMemo(
    () => ({ clients, loading, error, refresh: fetchClients }),
    [clients, loading, error, fetchClients]
  );
}

export function useClient(id?: number, options: UseClientOptions = {}) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withRelations = options.withRelations ?? false;

  const fetchClient = useCallback(async () => {
    if (!id) {
      setClient(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getClient(id, withRelations);
      setClient(data);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'We were unable to load the client. Please try again.';
      setError(message);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [id, withRelations]);

  useEffect(() => {
    void fetchClient();
  }, [fetchClient]);

  return useMemo(
    () => ({ client, loading, error, refresh: fetchClient }),
    [client, loading, error, fetchClient]
  );
}

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

export function useClientMutations() {
  const createMutation = useCallback((input: ClientInput) => {
    const normalized = normalizeClientInput(input);
    return createClient(normalized);
  }, []);

  const updateMutation = useCallback((id: number, input: ClientInput) => {
    const normalized = normalizeClientInput(input);
    return updateClient(id, normalized);
  }, []);

  const create = useMutationHandler(createMutation);
  const update = useMutationHandler(updateMutation);

  return {
    createClient: create.execute,
    updateClient: update.execute,
    createStatus: create.status,
    createError: create.error,
    resetCreate: create.reset,
    updateStatus: update.status,
    updateError: update.error,
    resetUpdate: update.reset
  };
}
