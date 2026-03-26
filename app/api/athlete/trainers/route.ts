import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("trainer_athletes")
    .select(`
      id, status, invited_by, invited_at, accepted_at,
      trainer:profiles!trainer_athletes_trainer_id_fkey(id, full_name, avatar_url)
    `)
    .eq("athlete_id", user.id)
    .order("invited_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ trainers: data ?? [] });
}
