import { createWaitlistHandler } from '../lib/waitlist.mjs';

// No imports, campaigns, welcome messages, or scheduled jobs run on deployment.
export default { fetch: createWaitlistHandler() };
