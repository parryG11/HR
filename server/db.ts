// Test comment
// Intentionally placing dotenv.config() at the very top.
import dotenv from 'dotenv';
dotenv.config();

import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import ws from "ws"; // Required for Neon serverless over WebSocket
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable must be set. Please check your .env file or environment configuration.",
  );
}

let db: ReturnType<typeof drizzleNodePostgres> | ReturnType<typeof drizzleNeonServerless>;
let pool: PgPool | NeonPool;

if (process.env.NODE_ENV === 'production') {
  console.log("Initializing Neon serverless driver for production environment.");
  // Configure Neon to use WebSockets, necessary for serverless environments.
  neonConfig.webSocketConstructor = ws;
  const neonPoolInstance = new NeonPool({ connectionString: process.env.DATABASE_URL });
  pool = neonPoolInstance;
  db = drizzleNeonServerless({ client: neonPoolInstance, schema });
  console.log("Neon serverless driver initialized successfully.");
} else {
  console.log("Initializing node-postgres (pg) driver for development environment.");
  const pgPoolInstance = new PgPool({ connectionString: process.env.DATABASE_URL });
  pool = pgPoolInstance;
  db = drizzleNodePostgres(pgPoolInstance, { schema }); // Drizzle for node-postgres takes the pool directly
  console.log("node-postgres (pg) driver initialized successfully.");
}

export { db, pool, schema };