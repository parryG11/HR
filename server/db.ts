import './loadEnv'; // Load environment variables first
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import ws from "ws"; // Required for Neon serverless over WebSocket
import { sql } from "drizzle-orm"; // Added sql import
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable must be set. Please check your .env file or environment configuration.",
  );
}

let db: ReturnType<typeof drizzleNodePostgres> | ReturnType<typeof drizzleNeonServerless>;
let pool: PgPool | NeonPool;

// Helper to determine if the database is local
const isLocalDatabase = (url: string) => url.includes('localhost') || url.includes('127.0.0.1');

// Use Neon for production ONLY if the database is not local
if (process.env.NODE_ENV === 'production' && !isLocalDatabase(process.env.DATABASE_URL)) {
  console.log("Initializing Neon serverless driver for production environment.");
  neonConfig.webSocketConstructor = ws;
  const neonPoolInstance = new NeonPool({ connectionString: process.env.DATABASE_URL });
  pool = neonPoolInstance;
  db = drizzleNeonServerless({ client: neonPoolInstance, schema });
  console.log("Neon serverless driver initialized successfully.");
} else {
  // Use standard node-postgres for development or local production databases
  const envType = process.env.NODE_ENV === 'development' ? 'development' : 'local production';
  console.log(`Initializing node-postgres (pg) driver for ${envType} environment.`);
  const pgPoolInstance = new PgPool({ connectionString: process.env.DATABASE_URL });
  pool = pgPoolInstance;
  db = drizzleNodePostgres(pgPoolInstance, { schema });
  console.log("node-postgres (pg) driver initialized successfully.");
}

export { db, pool, schema }; // Exported new variables
