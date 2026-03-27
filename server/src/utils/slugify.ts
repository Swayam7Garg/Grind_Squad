/**
 * Extracts a normalized slug from a problem URL.
 * Works for LeetCode, GFG, and Codeforces.
 *
 * Examples:
 *  - https://leetcode.com/problems/two-sum/         → "leetcode-two-sum"
 *  - https://practice.geeksforgeeks.org/problems/xyz → "gfg-xyz"
 *  - https://codeforces.com/problemset/problem/1/A   → "cf-1-A"
 */
export function slugFromUrl(url: string): string {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        if (host.includes("leetcode.com")) {
            const match = parsed.pathname.match(/\/problems\/([^/]+)/);
            return match ? `leetcode-${match[1]}` : `leetcode-${Date.now()}`;
        }

        if (host.includes("geeksforgeeks.org")) {
            const match = parsed.pathname.match(/\/problems\/([^/]+)/);
            return match ? `gfg-${match[1]}` : `gfg-${Date.now()}`;
        }

        if (host.includes("codeforces.com")) {
            const match = parsed.pathname.match(/\/problem(?:set\/problem)?\/(\d+)\/([A-Z]\d?)/i);
            return match ? `cf-${match[1]}-${match[2]}` : `cf-${Date.now()}`;
        }

        // Fallback: use hostname + pathname
        const clean = parsed.pathname.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        return `other-${clean || Date.now()}`;
    } catch {
        return `unknown-${Date.now()}`;
    }
}

/**
 * Detect the platform from a URL.
 */
export function detectPlatform(url: string): "LEETCODE" | "GFG" | "CODEFORCES" | "OTHER" {
    const lower = url.toLowerCase();
    if (lower.includes("leetcode.com")) return "LEETCODE";
    if (lower.includes("geeksforgeeks.org")) return "GFG";
    if (lower.includes("codeforces.com")) return "CODEFORCES";
    return "OTHER";
}
