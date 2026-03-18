```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_points integer DEFAULT 0;
```

Run `003_gamification_rls.sql` if points/achievement inserts fail (policies for `points_ledger` INSERT and `achievements` INSERT).
