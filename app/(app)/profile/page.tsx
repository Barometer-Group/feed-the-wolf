import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: trainers }, { data: clients }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_athlete, is_trainer")
      .eq("id", user.id)
      .single(),
    supabase
      .from("trainer_athletes")
      .select("id, status, invited_by, trainer:profiles!trainer_athletes_trainer_id_fkey(id, full_name, avatar_url)")
      .eq("athlete_id", user.id)
      .order("invited_at", { ascending: false }),
    supabase
      .from("trainer_athletes")
      .select("id, status, invited_by, athlete:profiles!trainer_athletes_athlete_id_fkey(id, full_name, avatar_url)")
      .eq("trainer_id", user.id)
      .order("invited_at", { ascending: false }),
  ]);

  if (!profile) redirect("/login");

  type R = Parameters<typeof ProfileClient>[0];
  const cookieStore = await cookies();
  const rawMode = cookieStore.get("active_mode")?.value;
  const initialMode: "athlete" | "trainer" =
    rawMode === "trainer" ? "trainer" : "athlete";

  return (
    <ProfileClient
      profile={profile}
      initialMode={initialMode}
      trainers={(trainers ?? []) as unknown as R["trainers"]}
      clients={(clients ?? []) as unknown as R["clients"]}
    />
  );
}
