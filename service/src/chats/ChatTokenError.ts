export class ChatTokenError extends Error {
  constructor(public code: 'name_taken', message: string) {
    super(message);
  }
}
