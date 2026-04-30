// Augment the generated Env interface with secrets. Wrangler only emits
// secrets in worker-configuration.d.ts after they've been deployed via
// `wrangler secret put`, so we declare them ambiently here for local
// type-checking before first deploy.
declare namespace Cloudflare {
	interface Env {
		COOKIE_ENCRYPTION_KEY: string;
	}
}

interface Env extends Cloudflare.Env {
	COOKIE_ENCRYPTION_KEY: string;
}
