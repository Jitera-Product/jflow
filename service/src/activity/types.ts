export type FeatureActivityStore = {
  touch(feature: string, at: Date): Promise<void>;
  since(at: Date): Promise<string[]>;
};
