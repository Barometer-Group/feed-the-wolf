"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WolfLogo } from "@/components/shared/WolfLogo";
import { toast } from "sonner";

type RoleOption = "athlete" | "trainer";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleOption>("athlete");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Signup failed");
        return;
      }

      if (data.session) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success("Account created! Welcome.");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.success("Account created! Check your email to confirm.");
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex min-h-screen flex-col items-center bg-black p-4 pt-10 overflow-auto">
      <WolfLogo />
      <p className="mt-10 text-center text-white text-2xl font-semibold tracking-[0.1em]">
        Feed the Wolf
      </p>
      <div className="auth-form-fade w-full max-w-sm mt-8">
        <style>{`
          @keyframes authFormFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .auth-form-fade {
            opacity: 0;
            animation: authFormFadeIn 0.4s ease-out 1.8s forwards;
          }
          @media (prefers-reduced-motion: reduce) {
            .auth-form-fade { animation: none; opacity: 1; }
          }
        `}</style>
        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Sign up for Feed the Wolf</CardDescription>
          </CardHeader>
          <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label>I am a</Label>
            <Select value={role} onValueChange={(v) => setRole(v as RoleOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="athlete">Athlete</SelectItem>
                <SelectItem value="trainer">Trainer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
      </div>
    </div>
  );
}
