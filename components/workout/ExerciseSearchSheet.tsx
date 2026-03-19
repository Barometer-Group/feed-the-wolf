"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import { toast } from "sonner";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type Category = "strength" | "cardio" | "flexibility" | "sports";

const CATEGORIES: { value: Category | "all"; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "🔍" },
  { value: "strength", label: "Strength", icon: "💪" },
  { value: "cardio", label: "Cardio", icon: "🏃" },
  { value: "flexibility", label: "Flexibility", icon: "🧘" },
  { value: "sports", label: "Sports", icon: "⚽" },
];

const CUSTOM_CATEGORIES: { value: Category; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "flexibility", label: "Flexibility" },
  { value: "sports", label: "Sports" },
];

interface ExerciseSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
}

export function ExerciseSearchSheet({
  open,
  onOpenChange,
  exercises,
  onSelect,
}: ExerciseSearchSheetProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCategory, setCreateCategory] = useState<Category>("strength");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const cat = category === "all" ? null : category;
    return exercises.filter((e) => {
      const matchSearch = !q || e.name.toLowerCase().includes(q);
      const matchCat = !cat || e.category === cat;
      return matchSearch && matchCat;
    });
  }, [exercises, search, category]);

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    onOpenChange(false);
    setSearch("");
    setCategory("all");
    setShowCreateForm(false);
  };

  const openCreateForm = (prefillName: string) => {
    setCreateName(prefillName.trim());
    setCreateCategory("strength");
    setShowCreateForm(true);
  };

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setCreateName("");
    setCreateCategory("strength");
  };

  const handleSaveCustom = async () => {
    const name = createName.trim();
    if (!name) {
      toast.error("Enter an exercise name");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("exercises")
        .insert({
          name,
          category: createCategory,
          muscle_groups: [],
          description: null,
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message ?? "Failed to create exercise");
        return;
      }

      const newExercise = data as Exercise;
      handleSelect(newExercise);
      closeCreateForm();
    } catch {
      toast.error("Failed to create exercise");
    } finally {
      setSaving(false);
    }
  };

  const searchQuery = search.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-1 flex-col gap-4 overflow-hidden">
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            className="flex flex-nowrap gap-2 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {CATEGORIES.map((c) => {
              const isActive = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-2 text-center text-sm transition-colors min-h-[44px] justify-center ${
                    isActive
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="text-xs font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto">
            {showCreateForm ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <p className="text-sm font-medium text-zinc-200">
                  Create custom exercise
                </p>
                <Input
                  placeholder="Exercise name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_CATEGORIES.map((c) => (
                    <Button
                      key={c.value}
                      variant={createCategory === c.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCreateCategory(c.value)}
                      className={
                        createCategory !== c.value
                          ? "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          : ""
                      }
                    >
                      {c.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeCreateForm}
                    className="border-zinc-700"
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveCustom} disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No exercises found
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {filtered.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="w-full rounded-md border border-zinc-800 bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent"
                          onClick={() => handleSelect(e)}
                        >
                          {e.name}
                          <span className="ml-2 text-xs text-muted-foreground capitalize">
                            {e.category}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-md border border-dashed border-zinc-600 bg-zinc-900/50 px-4 py-3 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                    onClick={() => openCreateForm(searchQuery)}
                  >
                    + Create &quot;{searchQuery}&quot; as custom exercise
                  </button>
                )}
                <button
                  type="button"
                  className="mt-2 w-full rounded-md border border-dashed border-zinc-600 bg-zinc-900/50 px-4 py-3 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  onClick={() => openCreateForm("")}
                >
                  + Create Custom Exercise
                </button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
