// Test comment
// Intentionally placing dotenv.config() at the very top.
import dotenv from 'dotenv';
dotenv.config();

import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeonServerless } from 'drizzle-orm/neon-serverless';
import ws from "ws"; // Required for Neon serverless over WebSocket
import { sql } from "drizzle-orm"; // Added sql import
import * as schema from "@shared/schema";
import { leave_types, LeaveType } from "@shared/schema";

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

// Define default leave types
const defaultLeaveTypes: Omit<LeaveType, 'id'>[] = [
    { name: "Annual Leave", description: "Annual vacation leave", defaultDays: 20 },
    { name: "Sick Leave", description: "Leave for personal illness", defaultDays: 10 },
    { name: "Unpaid Leave", description: "Leave without pay", defaultDays: 0 },
    { name: "Bereavement Leave", description: "Leave for mourning a close relative", defaultDays: 5 },
    { name: "Maternity Leave", description: "Leave for new mothers", defaultDays: 90 },
];

// Seeding function for leave types
async function seedLeaveTypes() {
    console.log("Checking and seeding leave types if necessary...");
    try {
        const result = await db.select({ count: sql<number>`count(*)` }).from(leave_types);
        const count = result[0]?.count ?? 0;

        if (count === 0) {
            console.log("Leave types table is empty. Seeding default leave types...");
            for (const lt of defaultLeaveTypes) {
                await db.insert(leave_types).values(lt);
                console.log(`Inserted leave type: ${lt.name}`);
            }
            console.log("Leave types seeding completed successfully.");
        } else {
            console.log("Leave types table already has data. Seeding skipped.");
        }
    } catch (error) {
        console.error("Error seeding leave types:", error);
    }
}

// Call seeding function
seedLeaveTypes().catch(console.error);

export { db, pool, schema, defaultLeaveTypes, seedLeaveTypes }; // Exported new variables
