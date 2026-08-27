export type AsyncState = 'idle' | 'loading' | 'ready' | 'error' | 'empty';

export interface FoundationState<T> {
  status: AsyncState;
  data: T | null;
  error: string | null;
}

export function idleState<T>(): FoundationState<T> {
  return { status: 'idle', data: null, error: null };
}

export function loadingState<T>(): FoundationState<T> {
  return { status: 'loading', data: null, error: null };
}

export function readyState<T>(data: T): FoundationState<T> {
  return { status: 'ready', data, error: null };
}

export function emptyState<T>(): FoundationState<T> {
  return { status: 'empty', data: null, error: null };
}

export function errorState<T>(error: string): FoundationState<T> {
  return { status: 'error', data: null, error };
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected foundation state: ${String(value)}`);
}
