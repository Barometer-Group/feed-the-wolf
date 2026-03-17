-- Fix RLS infinite recursion (42P17)
-- Run this in Supabase SQL Editor

-- 1. Create the SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop affected policies (that query profiles for admin check)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage trainer_athletes" ON trainer_athletes;
DROP POLICY IF EXISTS "Admins can manage exercises" ON exercises;
DROP POLICY IF EXISTS "Admins can CRUD all plans" ON workout_plans;
DROP POLICY IF EXISTS "Plan exercises follow plan access" ON workout_plan_exercises;
DROP POLICY IF EXISTS "Admins can read all workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Admins can read all exercise logs" ON exercise_logs;
DROP POLICY IF EXISTS "Admins can read all media" ON media_uploads;
DROP POLICY IF EXISTS "Admins can read all achievements" ON achievements;
DROP POLICY IF EXISTS "Admins can read all points" ON points_ledger;

-- 3. Recreate policies using get_my_role()
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE USING (get_my_role() = 'admin');

CREATE POLICY "Admins can manage trainer_athletes"
  ON trainer_athletes FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "Admins can manage exercises"
  ON exercises FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "Admins can CRUD all plans"
  ON workout_plans FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "Plan exercises follow plan access"
  ON workout_plan_exercises FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workout_plans p
      WHERE p.id = plan_id
      AND (
        p.created_by = auth.uid()
        OR p.athlete_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trainer_athletes ta
          WHERE ta.trainer_id = auth.uid() AND ta.athlete_id = p.athlete_id
        )
        OR get_my_role() = 'admin'
      )
    )
  );

CREATE POLICY "Admins can read all workout logs"
  ON workout_logs FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "Admins can read all exercise logs"
  ON exercise_logs FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "Admins can read all media"
  ON media_uploads FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "Admins can read all achievements"
  ON achievements FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY "Admins can read all points"
  ON points_ledger FOR SELECT USING (get_my_role() = 'admin');
