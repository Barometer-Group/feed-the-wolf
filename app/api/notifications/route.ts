import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("media_uploads")
      .select("feedback_read")
      .eq("uploader_id", user.id)
      .not("trainer_feedback", "is", null);

    if (error) {
      return NextResponse.json({ unreadFeedbackCount: 0 });
    }

    const unread = (data ?? []).filter(
      (row) => (row as { feedback_read: boolean | null }).feedback_read !== true
    ).length;

    return NextResponse.json({ unreadFeedbackCount: unread });
  } catch {
    return NextResponse.json({ unreadFeedbackCount: 0 });
  }
}
