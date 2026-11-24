export interface Documents {
  read(path: string): Promise<string | null>; // null when the file does not exist
  list(path: string): Promise<string[]>; // entry names, folders end with '/'
  create(path: string, content: string): Promise<void>;
  update(path: string, content: string): Promise<void>;
}

export type ToolResult = { content?: Array<{ type: string; text?: string }>; isError?: boolean };
