export type FeatureActivityStore = {
  touch(feature: string, at: Date): Promise<void>; // a jflow tool was called for the feature
  since(at: Date): Promise<string[]>; // features with a tool call at or after at
};
