"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type Category = "strength" | "cardio" | "flexibility" | "sports";

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
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
  };

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
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <Button
                key={c.value}
                variant={category === c.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exercises found</p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="w-full rounded-md border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent"
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
