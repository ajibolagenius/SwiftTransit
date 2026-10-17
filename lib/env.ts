import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  EXPO_PUBLIC_MAP_STYLE_LIGHT: z.url().default('https://tiles.openfreemap.org/styles/positron'),
  EXPO_PUBLIC_MAP_STYLE_DARK: z.url().default('https://tiles.openfreemap.org/styles/dark'),
  EXPO_PUBLIC_DEV_AUTH_STUB: z.enum(['customer', 'courier']).optional(),
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_APPLE_CLIENT_ID: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment. Copy .env.example to .env and fill it in.\n${problems}`);
  }
  return result.data;
}

// Expo only inlines EXPO_PUBLIC_* vars that are read statically, so list each one.
export const env = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_MAP_STYLE_LIGHT: process.env.EXPO_PUBLIC_MAP_STYLE_LIGHT || undefined,
  EXPO_PUBLIC_MAP_STYLE_DARK: process.env.EXPO_PUBLIC_MAP_STYLE_DARK || undefined,
  EXPO_PUBLIC_DEV_AUTH_STUB: process.env.EXPO_PUBLIC_DEV_AUTH_STUB || undefined,
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || undefined,
  EXPO_PUBLIC_APPLE_CLIENT_ID: process.env.EXPO_PUBLIC_APPLE_CLIENT_ID || undefined,
});
