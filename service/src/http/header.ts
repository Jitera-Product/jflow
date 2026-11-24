import type { IncomingMessage } from 'node:http';

export const header = (req: IncomingMessage, name: string) => req.headers[name] as string | undefined;
