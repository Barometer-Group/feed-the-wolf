-- Feed the Wolf - Exercise library seed
-- Run after 001_initial.sql

insert into exercises (name, category, muscle_groups, description) values
-- Strength
('Bench Press', 'strength', '{"chest", "triceps", "shoulders"}', 'Barbell flat bench press'),
('Squat', 'strength', '{"quadriceps", "glutes", "hamstrings"}', 'Barbell back squat'),
('Deadlift', 'strength', '{"back", "hamstrings", "glutes"}', 'Conventional barbell deadlift'),
('Overhead Press', 'strength', '{"shoulders", "triceps"}', 'Standing barbell overhead press'),
('Barbell Row', 'strength', '{"back", "biceps"}', 'Bent-over barbell row'),
('Pull-up', 'strength', '{"back", "biceps"}', 'Bodyweight pull-up'),
('Dip', 'strength', '{"chest", "triceps", "shoulders"}', 'Parallel bar dip'),
('Lunge', 'strength', '{"quadriceps", "glutes", "hamstrings"}', 'Walking or stationary lunge'),
('Leg Press', 'strength', '{"quadriceps", "glutes", "hamstrings"}', 'Machine leg press'),
('Romanian Deadlift', 'strength', '{"hamstrings", "glutes", "back"}', 'RDL with focus on hamstring stretch'),
('Bicep Curl', 'strength', '{"biceps"}', 'Barbell or dumbbell bicep curl'),
('Tricep Pushdown', 'strength', '{"triceps"}', 'Cable tricep pushdown'),
('Lat Pulldown', 'strength', '{"back", "biceps"}', 'Cable lat pulldown'),
('Cable Row', 'strength', '{"back", "biceps"}', 'Seated cable row'),
('Incline Bench Press', 'strength', '{"chest", "triceps", "shoulders"}', 'Barbell incline bench press'),

-- Cardio
('Run', 'cardio', '{"legs", "cardiovascular"}', 'Running on treadmill or outdoor'),
('Bike', 'cardio', '{"legs", "cardiovascular"}', 'Stationary or road cycling'),
('Row', 'cardio', '{"back", "legs", "cardiovascular"}', 'Rowing machine'),
('Jump Rope', 'cardio', '{"legs", "cardiovascular"}', 'Jump rope intervals'),
('Stair Climber', 'cardio', '{"legs", "cardiovascular"}', 'Stair climber machine'),
('Elliptical', 'cardio', '{"legs", "cardiovascular"}', 'Elliptical machine'),

-- Flexibility
('Static Stretch', 'flexibility', '{"full body"}', 'Held stretches for major muscle groups'),
('Yoga Flow', 'flexibility', '{"full body"}', 'Yoga flow sequence'),
('Foam Roll', 'flexibility', '{"full body"}', 'Self-myofascial release with foam roller'),

-- Sports
('Box Jump', 'sports', '{"legs", "explosive"}', 'Plyometric box jump'),
('Kettlebell Swing', 'sports', '{"posterior chain", "cardiovascular"}', 'Two-hand kettlebell swing'),
('Battle Ropes', 'sports', '{"shoulders", "core", "cardiovascular"}', 'Battle rope waves'),
('Sled Push', 'sports', '{"legs", "full body"}', 'Pushing weighted sled'),
('Burpee', 'sports', '{"full body", "cardiovascular"}', 'Burpee exercise');
