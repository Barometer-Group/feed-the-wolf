import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Find trainer by email via RPC (trainers must already have an account)
  const { data: trainerId } = await supabase.rpc("get_user_id_by_email", { email });
  if (!trainerId) {
    return NextResponse.json({ error: "No account found with that email. Ask your trainer to sign up first." }, { status: 404 });
  }

  // Verify they are actually a trainer
  const { data: trainerProfile } = await supabase
    .from("profiles")
    .select("is_trainer, full_name")
    .eq("id", trainerId)
    .single();

  if (!trainerProfile?.is_trainer) {
    return NextResponse.json({ error: "That account is not registered as a trainer." }, { status: 400 });
  }

  // Check if relationship already exists
  const { data: existing } = await supabase
    .from("trainer_athletes")
    .select("id, status")
    .eq("trainer_id", trainerId)
    .eq("athlete_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      error: existing.status === "accepted"
        ? "Already connected with this trainer"
        : "Invite already pending",
    }, { status: 409 });
  }

  const { data: invite, error: inviteErr } = await supabase
    .from("trainer_athletes")
    .insert({
      trainer_id: trainerId,
      athlete_id: user.id,
      status: "pending",
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite/${invite.id}`;
  return NextResponse.json({ inviteUrl, trainerName: trainerProfile.full_name });
}
