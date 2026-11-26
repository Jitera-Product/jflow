export type ChatToken = { id: string; name: string; createdBy: string; createdAt: string; lastUsedAt: string | null };

export type StoredChatToken = { id: string; name: string; token: string; createdBy: string; createdAt: Date; lastUsedAt: Date | null }; // token is sealed

export type ChatTokenStore = {
  load(): Promise<StoredChatToken[]>;
  insert(row: StoredChatToken): Promise<boolean>; // false when the name is taken
  remove(id: string): Promise<boolean>;
  touch(id: string, at: Date): Promise<void>;
};

export type LiveChatTokens = {
  list(): ChatToken[];
  find(token: string): ChatToken | null;
  tokens(): string[];
  create(name: string, by: string): Promise<{ chat: ChatToken; token: string }>;
  revoke(id: string): Promise<boolean>;
  used(id: string): void;
};
