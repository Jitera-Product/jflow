export class GateError extends Error {
  constructor(public code: 'not_found' | 'invalid' | 'closed' | 'stale' | 'not_allowed' | 'not_ready' | 'mismatch', message: string) {
    super(message);
  }
}
