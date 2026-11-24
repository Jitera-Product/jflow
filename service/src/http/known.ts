import { FeatureError } from '../feature/FeatureError.js';
import { GateError } from '../gates/GateError.js';

export const known = (e: unknown): e is FeatureError | GateError => e instanceof FeatureError || e instanceof GateError;
