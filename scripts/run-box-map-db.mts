import { createJiti } from 'jiti';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
await createJiti(import.meta.url, { alias: { 'server-only': require.resolve('server-only') }, nativeModules: ['pg'], tsconfigPaths: true, fsCache: false }).import('./verify-box-map-db.mts');
