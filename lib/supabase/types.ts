export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          role: "admin" | "trainer" | "athlete";
          leaderboard_visible: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_url?: string | null;
          role?: "admin" | "trainer" | "athlete";
          leaderboard_visible?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: "admin" | "trainer" | "athlete";
          leaderboard_visible?: boolean;
          created_at?: string;
        };
      };
      trainer_athletes: {
        Row: {
          id: string;
          trainer_id: string;
          athlete_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          trainer_id: string;
          athlete_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          trainer_id?: string;
          athlete_id?: string;
          created_at?: string;
        };
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          category: "strength" | "cardio" | "flexibility" | "sports";
          muscle_groups: string[];
          description: string | null;
          demo_video_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: "strength" | "cardio" | "flexibility" | "sports";
          muscle_groups?: string[];
          description?: string | null;
          demo_video_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: "strength" | "cardio" | "flexibility" | "sports";
          muscle_groups?: string[];
          description?: string | null;
          demo_video_url?: string | null;
          created_at?: string;
        };
      };
      workout_plans: {
        Row: {
          id: string;
          created_by: string;
          athlete_id: string | null;
          name: string;
          description: string | null;
          scheduled_date: string | null;
          is_template: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          athlete_id?: string | null;
          name: string;
          description?: string | null;
          scheduled_date?: string | null;
          is_template?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string;
          athlete_id?: string | null;
          name?: string;
          description?: string | null;
          scheduled_date?: string | null;
          is_template?: boolean;
          created_at?: string;
        };
      };
      workout_plan_exercises: {
        Row: {
          id: string;
          plan_id: string;
          exercise_id: string;
          order_index: number;
          prescribed_sets: number | null;
          prescribed_reps: number | null;
          prescribed_weight_lbs: number | null;
          prescribed_duration_seconds: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          exercise_id: string;
          order_index?: number;
          prescribed_sets?: number | null;
          prescribed_reps?: number | null;
          prescribed_weight_lbs?: number | null;
          prescribed_duration_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          exercise_id?: string;
          order_index?: number;
          prescribed_sets?: number | null;
          prescribed_reps?: number | null;
          prescribed_weight_lbs?: number | null;
          prescribed_duration_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      workout_logs: {
        Row: {
          id: string;
          athlete_id: string;
          plan_id: string | null;
          started_at: string;
          completed_at: string | null;
          overall_notes: string | null;
          perceived_effort: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          plan_id?: string | null;
          started_at?: string;
          completed_at?: string | null;
          overall_notes?: string | null;
          perceived_effort?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          plan_id?: string | null;
          started_at?: string;
          completed_at?: string | null;
          overall_notes?: string | null;
          perceived_effort?: number | null;
          created_at?: string;
        };
      };
      exercise_logs: {
        Row: {
          id: string;
          workout_log_id: string;
          exercise_id: string;
          set_number: number;
          reps: number | null;
          weight_lbs: number | null;
          duration_seconds: number | null;
          distance_meters: number | null;
          notes: string | null;
          logged_via: "voice" | "manual";
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_log_id: string;
          exercise_id: string;
          set_number: number;
          reps?: number | null;
          weight_lbs?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          notes?: string | null;
          logged_via?: "voice" | "manual";
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_log_id?: string;
          exercise_id?: string;
          set_number?: number;
          reps?: number | null;
          weight_lbs?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          notes?: string | null;
          logged_via?: "voice" | "manual";
          created_at?: string;
        };
      };
      media_uploads: {
        Row: {
          id: string;
          workout_log_id: string | null;
          exercise_log_id: string | null;
          uploader_id: string;
          url: string;
          type: "photo" | "video";
          caption: string | null;
          trainer_feedback: string | null;
          feedback_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_log_id?: string | null;
          exercise_log_id?: string | null;
          uploader_id: string;
          url: string;
          type: "photo" | "video";
          caption?: string | null;
          trainer_feedback?: string | null;
          feedback_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_log_id?: string | null;
          exercise_log_id?: string | null;
          uploader_id?: string;
          url?: string;
          type?: "photo" | "video";
          caption?: string | null;
          trainer_feedback?: string | null;
          feedback_read?: boolean;
          created_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          athlete_id: string;
          type: string;
          title: string;
          description: string | null;
          earned_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          type: string;
          title: string;
          description?: string | null;
          earned_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          type?: string;
          title?: string;
          description?: string | null;
          earned_at?: string;
          metadata?: Json;
        };
      };
      points_ledger: {
        Row: {
          id: string;
          athlete_id: string;
          points: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          points: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          points?: number;
          reason?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
