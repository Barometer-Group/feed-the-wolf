import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "trainer_acting_as";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { athleteId } = await request.json();

  if (!athleteId) {
    // Clear session
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE);
    return NextResponse.json({ ok: true });
  }

  // Verify this trainer actually has this client
  const { data: rel } = await supabase
    .from("trainer_athletes")
    .select("id")
    .eq("trainer_id", user.id)
    .eq("athlete_id", athleteId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!rel) return NextResponse.json({ error: "Not your client" }, { status: 403 });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, athleteId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
  return NextResponse.json({ ok: true });
}
