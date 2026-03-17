/**
 * Parses voice transcript into structured exercise log fields.
 * Matches exercise names against the library (case-insensitive fuzzy).
 */

export type ParsedVoiceInput = {
  exerciseName: string | null;
  sets: number | null;
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

/**
 * Normalize for matching: lowercase, collapse spaces, remove punctuation
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score how well transcript phrase matches an exercise name.
 * Returns 0-1 (1 = exact match).
 */
function matchScore(phrase: string, exerciseName: string): number {
  const n = normalize(phrase);
  const e = normalize(exerciseName);
  if (e.includes(n) || n.includes(e)) return 0.8;
  const nWords = n.split(/\s+/);
  const eWords = e.split(/\s+/);
  const overlap = nWords.filter((w) => eWords.some((ew) => ew.includes(w) || w.includes(ew))).length;
  return overlap / Math.max(nWords.length, eWords.length, 1);
}

/**
 * Find best-matching exercise name from library.
 */
function findExercise(transcript: string, exerciseNames: string[]): string | null {
  const normalized = normalize(transcript);
  if (!normalized) return null;

  let best: { name: string; score: number } | null = null;
  for (const name of exerciseNames) {
    const score = matchScore(normalized, name);
    if (score > 0.5 && (!best || score > best.score)) {
      best = { name, score };
    }
  }
  return best?.name ?? null;
}

/**
 * Extract numbers and units from transcript.
 * Handles: "135 pounds", "10 reps", "3 sets", "20 minutes", "60 seconds", "5 km", etc.
 */
function extractNumbers(transcript: string): {
  sets: number | null;
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
} {
  const t = transcript.toLowerCase();
  const result = {
    sets: null as number | null,
    reps: null as number | null,
    weightLbs: null as number | null,
    durationSeconds: null as number | null,
    distanceMeters: null as number | null,
  };

  // Numbers (integers and decimals)
  const numPattern = /(\d+\.?\d*)\s*(pounds?|lbs?|lb|reps?|sets?|minutes?|mins?|seconds?|secs?|meters?|metres?|m|km|miles?|mi)/gi;
  let m: RegExpExecArray | null;
  const re = new RegExp(numPattern.source, "gi");
  while ((m = re.exec(t)) !== null) {
    const val = parseFloat(m[1]);
    const unit = (m[2] || "").toLowerCase();
    if (/pounds?|lbs?|lb/.test(unit)) result.weightLbs = val;
    else if (/reps?/.test(unit)) result.reps = Math.round(val);
    else if (/sets?/.test(unit)) result.sets = Math.round(val);
    else if (/minutes?|mins?/.test(unit)) result.durationSeconds = Math.round(val * 60);
    else if (/seconds?|secs?/.test(unit)) result.durationSeconds = Math.round(val);
    else if (/meters?|metres?|m(?!i)/.test(unit)) result.distanceMeters = val;
    else if (/km/.test(unit)) result.distanceMeters = val * 1000;
    else if (/miles?|mi/.test(unit)) result.distanceMeters = val * 1609.34;
  }

  // "X sets of Y" or "3 sets of 8 at 185"
  const setsOfRepsAt = /(\d+)\s*sets?\s+of\s+(\d+)\s*(?:at|@)\s*(\d+)/i.exec(t);
  if (setsOfRepsAt) {
    result.sets = parseInt(setsOfRepsAt[1], 10);
    result.reps = parseInt(setsOfRepsAt[2], 10);
    result.weightLbs = parseFloat(setsOfRepsAt[3]);
  } else {
    const setsOfReps = /(\d+)\s*sets?\s+of\s+(\d+)/i.exec(t);
    if (setsOfReps) {
      result.sets = parseInt(setsOfReps[1], 10);
      result.reps = parseInt(setsOfReps[2], 10);
    }
  }

  const repsAtWeight = /(\d+)\s*reps?\s+(?:at|@)\s+(\d+)/i.exec(t);
  if (repsAtWeight && result.reps === null) result.reps = parseInt(repsAtWeight[1], 10);
  if (repsAtWeight && result.weightLbs === null) result.weightLbs = parseFloat(repsAtWeight[2]);

  const weightForReps = /(\d+)\s*(?:pounds?|lbs?)\s+(?:for\s+)?(\d+)\s*reps?/i.exec(t);
  if (weightForReps) {
    result.weightLbs = parseFloat(weightForReps[1]);
    if (result.reps === null) result.reps = parseInt(weightForReps[2], 10);
  }

  const ranForMinutes = /(?:ran|run|running)\s+for\s+(\d+)\s*minutes?/i.exec(t);
  if (ranForMinutes) result.durationSeconds = parseInt(ranForMinutes[1], 10) * 60;

  const forSeconds = /for\s+(\d+)\s*seconds?/i.exec(t);
  if (forSeconds && result.durationSeconds === null)
    result.durationSeconds = parseInt(forSeconds[1], 10);

  // Standalone numbers as reps if nothing else
  const standaloneNum = /(?:^|\s)(\d+)\s+(?:pull[- ]?ups?|push[- ]?ups?|dips?|squats?)/i.exec(t);
  if (standaloneNum && result.reps === null) result.reps = parseInt(standaloneNum[1], 10);

  return result;
}

/**
 * Remove exercise name and numbers from transcript to get a cleaner phrase for matching.
 * Keeps words that might be exercise names.
 */
function extractPhraseForExercise(transcript: string): string {
  let t = transcript
    .toLowerCase()
    .replace(/\b(\d+)\s*(?:sets?|reps?|pounds?|lbs?|minutes?|seconds?|meters?|km|miles?)\b/gi, " ")
    .replace(/\bsets?\s+of\b/gi, " ")
    .replace(/\b(?:at|for|@)\s+\d+/gi, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t;
}

/**
 * Parse a voice transcript into structured fields.
 * @param transcript - Raw speech-to-text output
 * @param exerciseNames - List of exercise names from the library for fuzzy matching
 * @returns ParsedVoiceInput or null if no numbers could be extracted (and no exercise matched)
 */
export function parseVoiceInput(
  transcript: string,
  exerciseNames: string[]
): ParsedVoiceInput | null {
  if (!transcript?.trim()) return null;

  const nums = extractNumbers(transcript);
  const hasAnyNumber =
    nums.sets != null ||
    nums.reps != null ||
    nums.weightLbs != null ||
    nums.durationSeconds != null ||
    nums.distanceMeters != null;

  const phrase = extractPhraseForExercise(transcript);
  const exerciseName = exerciseNames.length
    ? findExercise(phrase || transcript, exerciseNames)
    : null;

  if (!exerciseName && !hasAnyNumber) return null;

  return {
    exerciseName,
    sets: nums.sets,
    reps: nums.reps,
    weightLbs: nums.weightLbs,
    durationSeconds: nums.durationSeconds,
    distanceMeters: nums.distanceMeters,
  };
}
