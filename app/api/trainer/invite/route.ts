import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the inviting user is a trainer
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_trainer")
    .eq("id", user.id)
    .single();
  if (!profile?.is_trainer) return NextResponse.json({ error: "Not a trainer" }, { status: 403 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const service = createServiceClient();

  // Look up athlete by email
  const { data: athleteProfile } = await service
    .from("profiles")
    .select("id")
    .eq("id", (
      await service.rpc("get_user_id_by_email", { email })
    ).data)
    .maybeSingle();

  const athleteId = athleteProfile?.id ?? null;

  if (!athleteId) {
    return NextResponse.json({ error: "No Feed the Wolf account found for that email. Ask them to sign up first." }, { status: 404 });
  }

  if (athleteId) {
    // Check if relationship already exists
    const { data: existing } = await supabase
      .from("trainer_athletes")
      .select("id, status")
      .eq("trainer_id", user.id)
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: existing.status === "accepted"
          ? "Already connected with this athlete"
          : "Invite already sent",
      }, { status: 409 });
    }
  }

  const { data: invite, error: inviteErr } = await supabase
    .from("trainer_athletes")
    .insert({
      trainer_id: user.id,
      athlete_id: athleteId,
      status: "pending",
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite/${invite.id}`;
  return NextResponse.json({ inviteUrl, athleteFound: !!athleteId });
}
