import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TrainerClientList } from "./TrainerClientList";

export default async function TrainerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_trainer")
    .eq("id", user.id)
    .single();

  if (!profile?.is_trainer) redirect("/dashboard");

  const { data: clients } = await supabase
    .from("trainer_athletes")
    .select("id, status, trainer_notes, client_info, athlete:profiles!trainer_athletes_athlete_id_fkey(id, full_name, avatar_url)")
    .eq("trainer_id", user.id)
    .eq("status", "accepted")
    .order("invited_at", { ascending: false });

  return <TrainerClientList clients={(clients ?? []) as unknown as Parameters<typeof TrainerClientList>[0]["clients"]} />;
}
