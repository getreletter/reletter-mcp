import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type ToolResult = {
	content: { type: "text"; text: string }[];
	isError?: boolean;
};

export type ApiFetch = (
	path: string,
	params?: Record<string, string | undefined>,
) => Promise<ToolResult>;

// Registers every Reletter tool against an McpServer. Transport-agnostic: the
// Worker passes an apiFetch bound to the OAuth-provided key, the stdio entry
// passes one bound to RELETTER_API_KEY. Keep tool defs here so both stay in sync.
export function registerReletterTools(server: McpServer, apiFetch: ApiFetch) {
	// 1. Search publications
	server.tool(
		"search_publications",
		"Search for newsletters by topic, title, or author across Substack, LinkedIn, Ghost, Beehiiv and Kit. Returns subscriber numbers per publication. Specify either `query` or `filters` or both. Filters are comma-separated, e.g. `subscribers:gte:5000,active:is:true,platforms:any:substack-beehiiv-kit`. Full filter reference: https://reletter.com/developers/search-filters",
		{
			query: z.string().optional().describe("Search query. Supports parentheses for grouping, quotes for exact match, AND, OR and -negation."),
			mode: z.enum(["topics", "titles", "authors"]).optional().describe("Search mode. Default: topics."),
			per_page: z.number().optional().describe("Results per page, max 100. Default: 50."),
			page: z.number().optional().describe("Page number, starts at 1."),
			filters: z.string().optional().describe("Advanced search filters, comma-separated, e.g. `subscribers:gte:5000,active:is:true,languages:any:en,platforms:any:substack-beehiiv-kit`. See https://reletter.com/developers/search-filters for the full list."),
		},
		async ({ query, mode, per_page, page, filters }) => {
			return apiFetch("/api/search/publications/", {
				query,
				mode,
				per_page: per_page?.toString(),
				page: page?.toString(),
				filters,
			});
		},
	);

	// 2. Search issues
	server.tool(
		"search_issues",
		"Search across the body and titles of every newsletter issue Reletter has indexed. Returns highlighted snippets when `highlight=true`. Accepts the same `filters` parameter as search_publications; filters apply to the parent publication.",
		{
			query: z.string().optional().describe("Search query. Supports parentheses, quotes, AND, OR and -negation."),
			per_page: z.number().optional().describe("Results per page, max 100. Default: 50."),
			page: z.number().optional().describe("Page number, starts at 1."),
			filters: z.string().optional().describe("Same syntax and filter set as search_publications; filters apply to the parent publication, e.g. `subscribers:gte:5000,languages:any:en`. See https://reletter.com/developers/search-filters."),
			highlight: z.boolean().optional().describe("If true, the response includes a `highlight` field per issue with query matches wrapped in HTML <b> tags."),
			publication_id: z.string().optional().describe("Scope results to a single publication by its Reletter ID."),
			threshold: z.number().optional().describe("Only return issues published within the last N seconds (max 1209600 = 14 days)."),
		},
		async ({ query, per_page, page, filters, highlight, publication_id, threshold }) => {
			return apiFetch("/api/search/issues/", {
				query,
				per_page: per_page?.toString(),
				page: page?.toString(),
				filters,
				highlight: highlight?.toString(),
				publication_id,
				threshold: threshold?.toString(),
			});
		},
	);

	// 3. Autocomplete
	server.tool(
		"autocomplete",
		"Returns suggested keywords and matching newsletters for a search query.",
		{
			mode: z.enum(["topics", "titles", "authors", "issues"]).describe("Search mode."),
			query: z.string().describe("Search query."),
		},
		async ({ mode, query }) => {
			return apiFetch("/api/search/autocomplete/", { mode, query });
		},
	);

	// 4. Get publication
	server.tool(
		"get_publication",
		"Look up full metadata for a newsletter by its Reletter slug, e.g. 'doomberg'. Includes subscribers, engagement, social, contributors, recent issues, rankings, and SEO reach (Google search keywords and estimated traffic).",
		{
			publication_id: z.string().describe("The Reletter publication ID, e.g. 'doomberg'."),
		},
		async ({ publication_id }) => {
			return apiFetch(`/api/publications/${encodeURIComponent(publication_id)}/`);
		},
	);

	// 5. List issues for a publication
	server.tool(
		"list_issues",
		"List the 100 most recent issues for a publication in reverse chronological order.",
		{
			publication_id: z.string().describe("The Reletter publication ID."),
		},
		async ({ publication_id }) => {
			return apiFetch("/api/issues/", { publication_id });
		},
	);

	// 6. Get issue
	server.tool(
		"get_issue",
		"Full data for a single issue, including the body text and the publication it belongs to.",
		{ issue_id: z.string().describe("The Reletter issue ID.") },
		async ({ issue_id }) => {
			return apiFetch(`/api/issues/${encodeURIComponent(issue_id)}/`);
		},
	);

	// 7. Contacts
	server.tool(
		"contacts",
		"Email contacts, contact pages, and social accounts for a newsletter. Includes contributors where Reletter has identified them.",
		{ publication_id: z.string().describe("The Reletter publication ID.") },
		async ({ publication_id }) => {
			return apiFetch("/api/contacts/", { publication_id });
		},
	);

	// 8. Charts index
	server.tool(
		"chart_categories",
		"List available chart platforms and categories.",
		{},
		async () => {
			return apiFetch("/api/charts/");
		},
	);

	// 9. Chart rankings
	server.tool(
		"chart_rankings",
		"Latest chart rankings for a platform / category. Use chart_categories to discover valid platform and category slugs.",
		{
			platform: z.string().describe("Chart platform slug (from chart_categories)."),
			category: z.string().describe("Category slug (from chart_categories)."),
			variant: z.string().optional().describe("Optional variant: 'paid', 'free', 'rising', etc."),
		},
		async ({ platform, category, variant }) => {
			return apiFetch(
				`/api/charts/${encodeURIComponent(platform)}/${encodeURIComponent(category)}/`,
				{ variant },
			);
		},
	);

	// 10. Languages
	server.tool(
		"list_languages",
		"List every language. Codes are used with the `languages` search filter.",
		{},
		async () => {
			return apiFetch("/api/misc/languages/");
		},
	);

	// 11. Stats
	server.tool(
		"index_stats",
		"Global Reletter index stats: total publications, issues, etc.",
		{},
		async () => {
			return apiFetch("/api/misc/stats/");
		},
	);

	// 12. API quota
	server.tool(
		"api_quota",
		"Check your API request quota and usage for the current month.",
		{},
		async () => {
			return apiFetch("/api/accounts/quota/");
		},
	);
}
