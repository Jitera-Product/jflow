export class FeatureError extends Error {
  constructor(public code: 'not_found' | 'team_not_enabled' | 'no_folder' | 'not_allowed', message: string) {
    super(message);
  }
}
