import { LABEL_STAGE } from '../gates/moves.js';

export const flowLabels = (): string[] => Object.keys(LABEL_STAGE).map((k) => 'flow:' + k);
