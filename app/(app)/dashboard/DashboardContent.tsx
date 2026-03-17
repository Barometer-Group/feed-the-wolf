"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Role = "admin" | "trainer" | "athlete";

type DashboardContentProps = {
  userName: string;
  userRole: Role;
};

export function DashboardContent({ userName, userRole }: DashboardContentProps) {
  const [viewAs, setViewAs] = useState<Role>(userRole);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
          <Badge variant="secondary" className="mt-1 capitalize">
            {userRole}
          </Badge>
        </div>
        {(userRole === "admin" || userRole === "trainer") && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">View as:</span>
            <Select value={viewAs} onValueChange={(v) => setViewAs(v as Role)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="athlete">Athlete</SelectItem>
                <SelectItem value="trainer">Trainer</SelectItem>
                {userRole === "admin" && (
                  <SelectItem value="admin">Admin</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {viewAs === "athlete" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Athlete Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </>
      )}

      {viewAs === "trainer" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Trainer Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </>
      )}

      {viewAs === "admin" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Admin Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon</p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
