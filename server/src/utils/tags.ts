export const VALID_TAGS = [
    "arrays", "strings", "linked-list", "trees", "graphs",
    "dynamic-programming", "recursion", "backtracking",
    "binary-search", "sorting", "hashing", "heaps",
    "stacks", "queues", "greedy", "two-pointers",
    "sliding-window", "bit-manipulation", "math", "trie"
] as const;

export type Tag = typeof VALID_TAGS[number];

export function isValidTag(tag: string): tag is Tag {
    return VALID_TAGS.includes(tag as Tag);
}
