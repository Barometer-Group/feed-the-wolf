-- Add body_region to exercises for the 3-category progress chart
-- Values: 'upper' | 'lower' | 'core'
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS body_region text
  CHECK (body_region IN ('upper', 'lower', 'core'));

-- Auto-populate from exercise name and existing muscle_groups array
UPDATE exercises
SET body_region = CASE
  -- Lower body
  WHEN name ILIKE ANY(ARRAY[
    '%squat%', '%lunge%', '%deadlift%', '%leg press%', '%leg curl%',
    '%leg extension%', '%calf%', '%hip thrust%', '%glute%', '%rdl%',
    '%step up%', '%step-up%', '%split squat%', '%hack squat%',
    '%leg day%', '%hamstring%', '%quad%'
  ]) THEN 'lower'
  WHEN muscle_groups && ARRAY[
    'quads','hamstrings','glutes','calves','hip flexors',
    'adductors','abductors','legs'
  ]::text[] THEN 'lower'

  -- Core
  WHEN name ILIKE ANY(ARRAY[
    '%plank%', '%crunch%', '%sit up%', '%sit-up%', '%situp%',
    '%ab %', '% abs%', '%core%', '%russian twist%',
    '%mountain climber%', '%leg raise%', '%v-up%', '%v up%',
    '%dead bug%', '%bird dog%', '%flutter kick%'
  ]) THEN 'core'
  WHEN muscle_groups && ARRAY[
    'abs','obliques','core','transverse abdominis','lower back'
  ]::text[] THEN 'core'

  -- Everything else is upper
  ELSE 'upper'
END
WHERE body_region IS NULL;
