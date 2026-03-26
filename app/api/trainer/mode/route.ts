import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE = "active_mode";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mode } = await request.json() as { mode: "athlete" | "trainer" };
  if (mode !== "athlete" && mode !== "trainer") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  // If switching to athlete mode, also clear any acting-as session
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, mode, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  if (mode === "athlete") {
    cookieStore.delete("trainer_acting_as");
  }

  return NextResponse.json({ ok: true });
}
