import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Role = "admin" | "trainer" | "athlete";

type RoleGuardProps = {
  children: React.ReactNode;
  roles: Role[];
};

export async function RoleGuard({ children, roles }: RoleGuardProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as Role | undefined;
  if (!userRole || !roles.includes(userRole)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="text-xl font-semibold">Not authorized</h2>
        <p className="text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
