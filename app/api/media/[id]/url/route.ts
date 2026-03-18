import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BUCKET = "workout-media";

function isStoragePath(stored: string): boolean {
  return !stored.startsWith("http://") && !stored.startsWith("https://");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: row, error } = await supabase
      .from("media_uploads")
      .select("id, url, uploader_id")
      .eq("id", id)
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const r = row as { url: string; uploader_id: string };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile as { role?: string } | null)?.role ?? "athlete";

    let allowed = r.uploader_id === user.id;
    if (!allowed && role === "trainer") {
      const { data: ta } = await supabase
        .from("trainer_athletes")
        .select("id")
        .eq("trainer_id", user.id)
        .eq("athlete_id", r.uploader_id)
        .maybeSingle();
      allowed = !!ta;
    }
    if (!allowed && role === "admin") {
      allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isStoragePath(r.url)) {
      return NextResponse.json({ signedUrl: r.url, expiresIn: 86400 });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(r.url, 3600);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not sign URL" }, { status: 400 });
    }

    return NextResponse.json({ signedUrl: signed.signedUrl, expiresIn: 3600 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
