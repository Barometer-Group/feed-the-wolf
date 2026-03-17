import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <RoleGuard roles={["admin"]}>
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Coming soon</p>
        </CardContent>
      </Card>
    </RoleGuard>
  );
}
