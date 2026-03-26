import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { Sidebar } from "@/components/shared/Sidebar";
import { TrainerBanner } from "@/components/shared/TrainerBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, is_trainer, is_athlete")
    .eq("id", authUser.id)
    .maybeSingle();

  const profile = data as { full_name: string; avatar_url: string | null; is_trainer: boolean; is_athlete: boolean } | null;

  const cookieStore = await cookies();
  const activeMode = (cookieStore.get("active_mode")?.value ?? "athlete") as "athlete" | "trainer";
  const actingAsId = activeMode === "trainer" ? (cookieStore.get("trainer_acting_as")?.value ?? null) : null;

  let actingAs: { id: string; full_name: string; avatar_url: string | null } | null = null;
  if (actingAsId) {
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", actingAsId)
      .single();
    actingAs = clientProfile;
  }

  const isTrainerMode = activeMode === "trainer";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {isTrainerMode && (
        <style>{`html { background-color: #080d14; } body { background-color: #080d14; }`}</style>
      )}
      <Sidebar isTrainerMode={isTrainerMode} />
      <div className="flex flex-1 flex-col pb-14 lg:pb-0">
        <Header user={profile} />
        {isTrainerMode && actingAs && <TrainerBanner client={actingAs} />}
        <main className="flex-1 p-4">{children}</main>
      </div>
      <BottomNav isTrainerMode={isTrainerMode} />
    </div>
  );
}
