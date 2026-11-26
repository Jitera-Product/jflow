export class SettingsError extends Error {
  constructor(public problems: string[]) {
    super(problems.join('; '));
  }
}
