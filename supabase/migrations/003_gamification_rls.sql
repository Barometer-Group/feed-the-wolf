-- Allow athletes to record their own points and achievements (API uses user JWT)
CREATE POLICY "Athletes insert own points"
  ON points_ledger FOR INSERT
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "Athletes insert own achievements"
  ON achievements FOR INSERT
  WITH CHECK (athlete_id = auth.uid());
