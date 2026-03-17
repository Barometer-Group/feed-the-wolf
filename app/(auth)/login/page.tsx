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
import { Separator } from "@/components/ui/separator";
import { WolfLogo } from "@/components/shared/WolfLogo";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const router = useRouter();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Sign in failed");
        return;
      }

      if (data.session) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error("Sign in failed - no session returned");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicLinkLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Check your email for the magic link");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setMagicLinkLoading(false);
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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
        <form onSubmit={handlePasswordLogin} className="space-y-4">
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
            />
          </div>
          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={passwordLoading}>
            {passwordLoading ? "Signing in..." : "Sign in with password"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleMagicLink}
          disabled={magicLinkLoading || !email}
        >
          {magicLinkLoading ? "Sending..." : "Send magic link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
      </div>
    </div>
  );
}
