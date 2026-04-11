export const VALID_TAGS = [
  'arrays', 'strings', 'linked-list', 'trees', 'graphs',
  'dynamic-programming', 'recursion', 'backtracking',
  'binary-search', 'sorting', 'hashing', 'heaps',
  'stacks', 'queues', 'greedy', 'two-pointers',
  'sliding-window', 'bit-manipulation', 'math', 'trie',
] as const;

export type Tag = typeof VALID_TAGS[number];

export const PLATFORM_LABELS: Record<string, string> = {
  LEETCODE: 'LeetCode',
  GFG: 'GFG',
  CODEFORCES: 'Codeforces',
  OTHER: 'Other',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'chip-easy',
  MEDIUM: 'chip-medium',
  HARD: 'chip-hard',
};
