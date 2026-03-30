import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import os from "os";
import path from "path";

const dataDir = process.env.PGLITE_DATA_DIR
  ?? path.join(os.homedir(), ".golf-score-cart-db");

const client = new PGlite(dataDir);

async function setupSchema() {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS scorecards (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      game_format TEXT NOT NULL DEFAULT 'stroke',
      players JSONB NOT NULL,
      hole_scores JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

await setupSchema();

export const db = drizzle(client, { schema });

export * from "./schema";
