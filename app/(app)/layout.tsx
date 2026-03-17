import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { Sidebar } from "@/components/shared/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", authUser.id)
    .maybeSingle();

  const profile = data as { full_name: string; avatar_url: string | null; role: string } | null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col pb-14 lg:pb-0">
        <Header user={profile} />
        <main className="flex-1 p-4">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
