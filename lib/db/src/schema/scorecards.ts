import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scorecardsTable = pgTable("scorecards", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  gameFormat: text("game_format").notNull().default("stroke"),
  players: jsonb("players").notNull().$type<Array<{ name: string; handicap: number }>>(),
  holeScores: jsonb("hole_scores").notNull().$type<Array<{ holeNumber: number; scores: Array<number | null>; shots?: unknown[][] }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScorecardSchema = createInsertSchema(scorecardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScorecard = z.infer<typeof insertScorecardSchema>;
export type Scorecard = typeof scorecardsTable.$inferSelect;
