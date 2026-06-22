import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: '../../packages/db/src/schema.ts',
  out: './drizzle/migrations',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env['CLOUDFLARE_ACCOUNT_ID']!,
    databaseId: process.env['CLOUDFLARE_D1_DATABASE_ID']!,
    token: process.env['CLOUDFLARE_API_TOKEN']!,
  },
})
