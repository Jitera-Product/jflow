export const WINDOWS = [
  { value: '-P14D', label: 'last 14 days' },
  { value: '-P30D', label: 'last 30 days' },
  { value: '-P90D', label: 'last 90 days' },
];

export const KIND_LABEL = { off_board_project: 'Not on board', other_board_project: "Other's board project" } as const;

export const AGENT_LABEL = { ready: 'Agent-ready', working: 'Agent working', review: 'PR ready for review', stuck: 'Stuck' } as const;
