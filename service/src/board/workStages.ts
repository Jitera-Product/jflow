import type { StageName } from '../status/stages.js';

// the stages whose cards show Linear issues and PRs; only these cost a Linear and GitHub read
export const WORK_STAGES: StageName[] = ['Build', 'Verify'];
