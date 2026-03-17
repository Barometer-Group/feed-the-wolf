import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as { full_name: string; avatar_url: string | null; role: string } | null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <p className="text-sm text-muted-foreground capitalize">{profile?.role ?? ""}</p>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}
