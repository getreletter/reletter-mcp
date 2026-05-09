import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import { ApiKeyHandler } from "./api-key-handler";

type Props = {
	apiKey: string;
};

const BASE_URL = "https://api.reletter.com";

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
	server = new McpServer({
		name: "Reletter",
		version: "0.1.0",
	});

	private async apiFetch(path: string, params?: Record<string, string | undefined>) {
		const url = new URL(`${BASE_URL}${path}`);
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				if (v !== undefined && v !== "") url.searchParams.set(k, v);
			}
		}
		const resp = await fetch(url.toString(), {
			headers: { "x-reletter-api-key": this.props!.apiKey },
		});
		if (!resp.ok) {
			const text = await resp.text();
			return {
				content: [{ type: "text" as const, text: `Error ${resp.status}: ${text}` }],
				isError: true,
			};
		}
		const data = await resp.json();
		return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
	}

	async init() {
		// 1. Search publications
		this.server.tool(
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
				return this.apiFetch("/api/search/publications/", {
					query,
					mode,
					per_page: per_page?.toString(),
					page: page?.toString(),
					filters,
				});
			},
		);

		// 2. Search issues
		this.server.tool(
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
				return this.apiFetch("/api/search/issues/", {
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
		this.server.tool(
			"autocomplete",
			"Returns suggested keywords and matching newsletters for a search query.",
			{
				mode: z.enum(["topics", "titles", "authors", "issues"]).describe("Search mode."),
				query: z.string().describe("Search query."),
			},
			async ({ mode, query }) => {
				return this.apiFetch("/api/search/autocomplete/", { mode, query });
			},
		);

		// 4. Get publication
		this.server.tool(
			"get_publication",
			"Look up full metadata for a newsletter by its Reletter slug, e.g. 'doomberg'. Includes subscribers, engagement, social, contributors, recent issues, rankings, and SEO reach (Google search keywords and estimated traffic).",
			{
				publication_id: z.string().describe("The Reletter publication ID, e.g. 'doomberg'."),
			},
			async ({ publication_id }) => {
				return this.apiFetch(`/api/publications/${encodeURIComponent(publication_id)}/`);
			},
		);

		// 5. List issues for a publication
		this.server.tool(
			"list_issues",
			"List the 100 most recent issues for a publication in reverse chronological order.",
			{
				publication_id: z.string().describe("The Reletter publication ID."),
			},
			async ({ publication_id }) => {
				return this.apiFetch("/api/issues/", { publication_id });
			},
		);

		// 6. Get issue
		this.server.tool(
			"get_issue",
			"Full data for a single issue, including the body text and the publication it belongs to.",
			{ issue_id: z.string().describe("The Reletter issue ID.") },
			async ({ issue_id }) => {
				return this.apiFetch(`/api/issues/${encodeURIComponent(issue_id)}/`);
			},
		);

		// 7. Contacts
		this.server.tool(
			"contacts",
			"Email contacts, contact pages, and social accounts for a newsletter. Includes contributors where Reletter has identified them.",
			{ publication_id: z.string().describe("The Reletter publication ID.") },
			async ({ publication_id }) => {
				return this.apiFetch("/api/contacts/", { publication_id });
			},
		);

		// 8. Charts index
		this.server.tool(
			"chart_categories",
			"List available chart platforms and categories.",
			{},
			async () => {
				return this.apiFetch("/api/charts/");
			},
		);

		// 9. Chart rankings
		this.server.tool(
			"chart_rankings",
			"Latest chart rankings for a platform / category. Use chart_categories to discover valid platform and category slugs.",
			{
				platform: z.string().describe("Chart platform slug (from chart_categories)."),
				category: z.string().describe("Category slug (from chart_categories)."),
				variant: z.string().optional().describe("Optional variant: 'paid', 'free', 'rising', etc."),
			},
			async ({ platform, category, variant }) => {
				return this.apiFetch(
					`/api/charts/${encodeURIComponent(platform)}/${encodeURIComponent(category)}/`,
					{ variant },
				);
			},
		);

		// 10. Languages
		this.server.tool(
			"list_languages",
			"List every language. Codes are used with the `languages` search filter.",
			{},
			async () => {
				return this.apiFetch("/api/misc/languages/");
			},
		);

		// 11. Stats
		this.server.tool(
			"index_stats",
			"Global Reletter index stats: total publications, issues, etc.",
			{},
			async () => {
				return this.apiFetch("/api/misc/stats/");
			},
		);

		// 12. API quota
		this.server.tool(
			"api_quota",
			"Check your API request quota and usage for the current month.",
			{},
			async () => {
				return this.apiFetch("/api/accounts/quota/");
			},
		);
	}
}

const provider = new OAuthProvider({
	apiHandler: MyMCP.serve("/mcp"),
	apiRoute: "/mcp",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: ApiKeyHandler as any,
	tokenEndpoint: "/token",
});

// Wrap the provider so users can connect with just https://mcp.reletter.com
// without apiRoute "/" catching /authorize and /submit-api-key
export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		if (url.pathname === "/") {
			const rewritten = new Request(new URL("/mcp", url.origin).toString(), request);
			return provider.fetch(rewritten, env, ctx);
		}
		return provider.fetch(request, env, ctx);
	},
};
