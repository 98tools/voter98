import type { Config } from 'drizzle-kit';

export default {
  schema: './src/models/schema.ts',
  out: './migrations',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.jsonc',
    dbName: 'voter-db'
  }
} satisfies Config;
