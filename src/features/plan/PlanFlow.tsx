import { useEffect, useRef, useState } from 'react';
import type { Block, Task } from '../../types';
import { useApp } from '../../store/AppProvider';
import { PlanHeader, type PlanStep } from './PlanHeader';
import { PlanStepBrain } from './PlanStepBrain';
import { PlanStepPick } from './PlanStepPick';
import { PlanStepSchedule } from './PlanStepSchedule';
import './plan.css';

function buildCandidates(mits: Task[], collectTasks: Task[]): Task[] {
  const seen = new Set<string>();
  const candidates: Task[] = [];

  mits.forEach((task) => {
    if (task.status === 'done' || seen.has(task.id)) return;
    seen.add(task.id);
    candidates.push(task);
  });

  collectTasks.forEach((task) => {
    if (task.status !== 'inbox' && task.status !== 'moved') return;
    if (seen.has(task.id)) return;
    seen.add(task.id);
    candidates.push(task);
  });

  return candidates;
}

function defaultSelection(mits: Task[], candidates: Task[]): string[] {
  const ids: string[] = [];

  mits.forEach((task) => {
    if (task.status === 'done' || ids.includes(task.id) || ids.length >= 3) return;
    ids.push(task.id);
  });

  candidates.forEach((task) => {
    if (ids.length >= 3 || ids.includes(task.id)) return;
    ids.push(task.id);
  });

  return ids;
}

interface PlanMemory {
  date: string;
  ids: string[];
}

let planMemory: PlanMemory | null = null;

export default function PlanFlow() {
  const { state, plan, mits, collectTasks, today, addTask, commitPlan, closePlan, toast } = useApp();
  const planTaskIds = new Set(
    plan.blocks.map((block) => block.taskId).filter((id): id is string => Boolean(id)),
  );
  const planTasks = state.tasks.filter(
    (task) => planTaskIds.has(task.id) && task.status !== 'done',
  );
  const candidates = buildCandidates([...mits, ...planTasks], collectTasks);
  const remembered =
    planMemory && planMemory.date === today
      ? planMemory.ids.filter((id) => candidates.some((task) => task.id === id))
      : null;
  const [step, setStep] = useState<PlanStep>(1);
  const [draft, setDraft] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[] | null>(remembered);
  const rootRef = useRef<HTMLDivElement>(null);

  const picks = selectedIds ?? [];

  useEffect(() => {
    const container = rootRef.current?.closest('.app-scroll');
    if (container instanceof HTMLElement) {
      container.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [step]);

  function updatePicks(ids: string[]) {
    planMemory = { date: today, ids };
    setSelectedIds(ids);
  }

  function addFromDraft() {
    const title = draft.trim();
    if (!title) return;
    addTask({ title, category: 'create', energy: 'mid' });
    setDraft('');
  }

  function addQuick(title: string) {
    if (candidates.some((task) => task.title === title)) {
      toast('已经在候选里了');
      return;
    }
    addTask({ title, category: 'create', energy: 'mid' });
  }

  function goToPick() {
    if (selectedIds === null) {
      updatePicks(defaultSelection(mits, candidates));
    }
    setStep(2);
  }

  function togglePick(id: string) {
    if (picks.includes(id)) {
      updatePicks(picks.filter((current) => current !== id));
      return;
    }
    if (picks.length >= 3) {
      toast('今天只留三件');
      return;
    }
    updatePicks([...picks, id]);
  }

  const selectedTasks = picks
    .map((id) => candidates.find((task) => task.id === id))
    .filter((task): task is Task => Boolean(task));

  function commitBlocks(blocks: Block[]) {
    planMemory = null;
    commitPlan(
      blocks,
      selectedTasks.map((task) => task.id),
    );
  }

  return (
    <div className="screen plan" ref={rootRef}>
      <PlanHeader
        step={step}
        onBack={() => setStep(step === 3 ? 2 : 1)}
        onClose={closePlan}
      />

      {step === 1 ? (
        <PlanStepBrain
          tasks={candidates}
          draft={draft}
          onDraftChange={setDraft}
          onAdd={addFromDraft}
          onQuickAdd={addQuick}
          onNext={goToPick}
        />
      ) : null}

      {step === 2 ? (
        <PlanStepPick
          tasks={candidates}
          selectedIds={picks}
          onToggle={togglePick}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      ) : null}

      {step === 3 ? (
        <PlanStepSchedule tasks={selectedTasks} onCommit={commitBlocks} />
      ) : null}
    </div>
  );
}
