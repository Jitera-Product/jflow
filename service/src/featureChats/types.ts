export type FeatureChatStore = {
  get(feature: string): Promise<string | null>;
  remember(feature: string, chatId: string, at: Date): Promise<void>; // keeps the first chat of a feature
};
