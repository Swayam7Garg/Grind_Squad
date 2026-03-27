import { slugFromUrl, detectPlatform } from "../utils/slugify";

export interface ScrapedProblem {
    slug: string;
    title: string;
    url: string;
    platform: "LEETCODE" | "GFG" | "CODEFORCES" | "OTHER";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    tags: string[];
}

/**
 * Scraper Service
 *
 * Extracts problem metadata from a URL.
 * Currently uses URL-based heuristics for slug + platform detection.
 *
 * TODO (Phase 2):
 *  - Use fetch + cheerio/puppeteer to scrape actual title, difficulty, tags
 *  - LeetCode GraphQL API
 *  - GFG meta tag parsing
 *  - Codeforces API
 */
export async function scrapeProblem(url: string): Promise<ScrapedProblem> {
    const slug = slugFromUrl(url);
    const platform = detectPlatform(url);

    // Extract a human-readable title from the slug
    const titleFromSlug = slug
        .replace(/^(leetcode|gfg|cf|other)-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
        slug,
        title: titleFromSlug,
        url,
        platform,
        difficulty: "MEDIUM", // default until real scraping is implemented
        tags: [],
    };
}
