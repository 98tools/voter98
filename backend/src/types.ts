export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface CloudflareBindings {
  DB: D1Database;
  VOTER_KV: KVNamespace;
  JWT_SECRET: string;
  FRONTEND_URL?: string;
}

export type AppBindings = CloudflareBindings;
