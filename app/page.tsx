import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <h1 className="text-2xl font-bold">Feed the Wolf</h1>
      <Link
        href="/login"
        className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Go to Login
      </Link>
    </div>
  );
}
