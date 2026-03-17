"use client";

import { useState, useCallback } from "react";

interface SpeechRecognitionInstance {
  start: () => void;
  stop: () => void;
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onresult: ((e: { results: { length: number; [i: number]: { 0?: { transcript?: string } } } }) => void) | null;
  onend: (() => void) | null;
}
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { parseVoiceInput, type ParsedVoiceInput } from "@/lib/speech/parseVoiceInput";
import { toast } from "sonner";

export type VoiceInputSavePayload = {
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  notes: string | null;
};

interface VoiceInputProps {
  exerciseNames: string[];
  onSave: (payload: VoiceInputSavePayload) => void;
  disabled?: boolean;
}

export function VoiceInput({ exerciseNames, onSave, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [parsed, setParsed] = useState<ParsedVoiceInput | null>(null);
  const [editValues, setEditValues] = useState<{
    reps: string;
    weightLbs: string;
    durationSeconds: string;
    distanceMeters: string;
    notes: string;
  }>({ reps: "", weightLbs: "", durationSeconds: "", distanceMeters: "", notes: "" });

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition
      : null;

  const handleStart = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error("Voice not supported on this browser");
      return;
    }
    if (exerciseNames.length === 0) {
      toast.error("Exercise library not loaded");
      return;
    }
    const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (e: { results: { length: number; [i: number]: { 0?: { transcript?: string } } } }) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        transcript += (r?.[0]?.transcript ?? "") + " ";
      }
      transcript = transcript.trim();
      if (!transcript) return;
      const result = parseVoiceInput(transcript, exerciseNames);
      if (result) {
        setParsed(result);
        setEditValues({
          reps: result.reps != null ? String(result.reps) : "",
          weightLbs: result.weightLbs != null ? String(result.weightLbs) : "",
          durationSeconds: result.durationSeconds != null ? String(result.durationSeconds) : "",
          distanceMeters: result.distanceMeters != null ? String(result.distanceMeters) : "",
          notes: "",
        });
      } else {
        toast.error("Couldn't understand that — try manual entry");
      }
    };
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  }, [SpeechRecognition, exerciseNames]);

  const handleCancel = useCallback(() => {
    setParsed(null);
  }, []);

  const handleConfirm = useCallback(() => {
    const r = parseFloat(editValues.reps);
    const w = parseFloat(editValues.weightLbs);
    const d = parseFloat(editValues.durationSeconds);
    const dist = parseFloat(editValues.distanceMeters);
    onSave({
      reps: editValues.reps !== "" ? (isNaN(r) ? null : Math.round(r)) : null,
      weightLbs: editValues.weightLbs !== "" ? (isNaN(w) ? null : w) : null,
      durationSeconds: editValues.durationSeconds !== "" ? (isNaN(d) ? null : Math.round(d)) : null,
      distanceMeters: editValues.distanceMeters !== "" ? (isNaN(dist) ? null : dist) : null,
      notes: editValues.notes.trim() || null,
    });
    setParsed(null);
  }, [editValues, onSave]);

  if (parsed) {
    return (
      <Card className="w-full">
        <CardHeader className="py-3">
          <p className="text-sm font-medium">Confirm voice input</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="voice-reps">Reps</Label>
              <Input
                id="voice-reps"
                type="number"
                inputMode="numeric"
                value={editValues.reps}
                onChange={(e) => setEditValues((v) => ({ ...v, reps: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="voice-weight">Weight (lbs)</Label>
              <Input
                id="voice-weight"
                type="number"
                inputMode="decimal"
                value={editValues.weightLbs}
                onChange={(e) => setEditValues((v) => ({ ...v, weightLbs: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="voice-duration">Duration (sec)</Label>
              <Input
                id="voice-duration"
                type="number"
                inputMode="numeric"
                value={editValues.durationSeconds}
                onChange={(e) => setEditValues((v) => ({ ...v, durationSeconds: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="voice-distance">Distance (m)</Label>
              <Input
                id="voice-distance"
                type="number"
                inputMode="decimal"
                value={editValues.distanceMeters}
                onChange={(e) => setEditValues((v) => ({ ...v, distanceMeters: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="voice-notes">Notes</Label>
            <Input
              id="voice-notes"
              value={editValues.notes}
              onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            Confirm & Save
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleStart}
      disabled={disabled || isListening}
      className={`min-h-[44px] min-w-[44px] ${isListening ? "animate-pulse" : ""}`}
    >
      {isListening ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
      <span className="sr-only">Log via voice</span>
    </Button>
  );
}
