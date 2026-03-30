import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { scorecardsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  CreateScorecardBody,
  UpdateScorecardBody,
  GetScorecardParams,
  UpdateScorecardParams,
  DeleteScorecardParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatScorecard(row: typeof scorecardsTable.$inferSelect) {
  return {
    id: row.id,
    date: row.date,
    gameFormat: row.gameFormat ?? "stroke",
    players: row.players,
    holeScores: row.holeScores,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const rows = await db.select().from(scorecardsTable).orderBy(scorecardsTable.createdAt);
  res.json(rows.map(formatScorecard));
});

router.post("/", async (req, res) => {
  const body = CreateScorecardBody.parse(req.body);
  const holeScores = Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    scores: body.players.map(() => null),
    shots: body.players.map(() => []),
  }));
  const [row] = await db
    .insert(scorecardsTable)
    .values({
      date: body.date,
      gameFormat: body.gameFormat ?? "stroke",
      players: body.players,
      holeScores,
    })
    .returning();
  res.status(201).json(formatScorecard(row));
});

router.get("/:id", async (req, res) => {
  const { id } = GetScorecardParams.parse({ id: Number(req.params.id) });
  const rows = await db.select().from(scorecardsTable).where(eq(scorecardsTable.id, id));
  if (!rows.length) {
    res.status(404).json({ error: "Scorecard not found" });
    return;
  }
  res.json(formatScorecard(rows[0]));
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateScorecardParams.parse({ id: Number(req.params.id) });
  const body = UpdateScorecardBody.parse(req.body);

  const updateData: Partial<typeof scorecardsTable.$inferInsert> = {
    holeScores: body.holeScores,
    updatedAt: new Date(),
  };

  if (body.players) {
    updateData.players = body.players;
  }

  if (body.gameFormat) {
    updateData.gameFormat = body.gameFormat;
  }

  const rows = await db
    .update(scorecardsTable)
    .set(updateData)
    .where(eq(scorecardsTable.id, id))
    .returning();
  if (!rows.length) {
    res.status(404).json({ error: "Scorecard not found" });
    return;
  }
  res.json(formatScorecard(rows[0]));
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteScorecardParams.parse({ id: Number(req.params.id) });
  await db.delete(scorecardsTable).where(eq(scorecardsTable.id, id));
  res.status(204).send();
});

export default router;
