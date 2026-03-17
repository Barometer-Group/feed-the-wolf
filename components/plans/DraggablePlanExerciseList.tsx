"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ExerciseRow, type PlanExerciseInput } from "./ExerciseRow";

interface DraggablePlanExerciseListProps {
  items: PlanExerciseInput[];
  onItemsChange: (items: PlanExerciseInput[]) => void;
}

export function DraggablePlanExerciseList({
  items,
  onItemsChange,
}: DraggablePlanExerciseListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = parseInt(String(active.id).replace("ex-", ""), 10);
    const newIdx = parseInt(String(over.id).replace("ex-", ""), 10);
    if (isNaN(oldIdx) || isNaN(newIdx)) return;
    const next = arrayMove(items, oldIdx, newIdx);
    onItemsChange(next);
  };

  const handleUpdate = (index: number, updates: Partial<PlanExerciseInput>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    onItemsChange(next);
  };

  const handleRemove = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((_, i) => `ex-${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.map((item, i) => (
            <ExerciseRow
              key={`${item.exercise.id}-${i}`}
              item={item}
              index={i}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
