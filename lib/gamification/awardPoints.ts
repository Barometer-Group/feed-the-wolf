import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Db = SupabaseClient<Database>;
type PointsLedgerInsert =
  Database["public"]["Tables"]["points_ledger"]["Insert"];

/** Postgrest types omit points_ledger insert in this project’s client inference. */
function insertPointsLedger(
  db: Db,
  row: PointsLedgerInsert
): Promise<{ error: { message: string } | null }> {
  const q = db.from("points_ledger") as unknown as {
    insert: (r: PointsLedgerInsert) => Promise<{ error: { message: string } | null }>;
  };
  return q.insert(row);
}

export async function awardPoints(
  client: SupabaseClient,
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  if (points <= 0 || !reason.trim()) return;

  const db = client as Db;
  const ledgerRow: PointsLedgerInsert = {
    athlete_id: userId,
    points,
    reason: reason.slice(0, 500),
  };
  const { error: insErr } = await insertPointsLedger(db, ledgerRow);
  if (insErr) throw new Error(insErr.message);

  const { data: rowRaw, error: selErr } = await client
    .from("profiles")
    .select("total_points")
    .eq("id", userId)
    .single();
  if (selErr) throw new Error(selErr.message);

  const row = rowRaw as { total_points: number | null } | null;
  const cur = row?.total_points ?? 0;
  const { error: upErr } = await client
    .from("profiles")
    .update({ total_points: cur + points })
    .eq("id", userId);
  if (upErr) throw new Error(upErr.message);
}
