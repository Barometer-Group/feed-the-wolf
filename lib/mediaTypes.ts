export type MediaType = "photo" | "video";

export interface MediaListItem {
  id: string;
  signedUrl: string;
  type: MediaType;
  created_at: string;
  uploader_id: string;
  uploader_name: string;
  workout_log_id: string | null;
  exercise_log_id: string | null;
  workout_date: string | null;
  exercise_name: string | null;
  trainer_feedback: string | null;
  feedback_read: boolean;
}
