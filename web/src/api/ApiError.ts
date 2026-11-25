export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly error: string,
    message?: string,
    readonly problems?: string[],
  ) {
    super(message);
  }
}
