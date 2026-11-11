import { createJiti } from 'jiti';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const jiti=createJiti(import.meta.url,{alias:{'server-only':require.resolve('server-only')},nativeModules:['exceljs','pg'],tsconfigPaths:true,fsCache:false});
await jiti.import('./test-meeting.mts');
