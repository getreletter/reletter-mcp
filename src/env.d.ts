// Augment the generated Env interface with secrets. Wrangler only emits
// secrets in worker-configuration.d.ts after they've been deployed via
// `wrangler secret put`, so we declare them ambiently here for local
// type-checking before first deploy.
//
// ORIGIN_SECRET proves to api.reletter.com that a request came through
// Cloudflare. The zone's Transform Rule that normally adds it doesn't run on
// subrequests from Workers in the same zone, so this Worker sends it itself.
declare namespace Cloudflare {
	interface Env {
		COOKIE_ENCRYPTION_KEY: string;
		ORIGIN_SECRET: string;
	}
}

interface Env extends Cloudflare.Env {
	COOKIE_ENCRYPTION_KEY: string;
	ORIGIN_SECRET: string;
}
