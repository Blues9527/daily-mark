import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Category, Energy, Task } from '../../types';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  ENERGY_META,
  ENERGY_ORDER,
} from '../../data/constants';
import { clamp } from '../../lib/format';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';

export interface TaskDraftValues {
  title: string;
  estimateMin: number;
  category: Category;
  energy: Energy;
}

interface TaskFormSheetProps {
  task: Task | null;
  defaultEstimateMin: number;
  onClose: () => void;
  onSave: (values: TaskDraftValues) => void;
  onDelete?: (id: string) => void;
}

const FORM_ID = 'collect-task-form';

function isCategory(value: string): value is Category {
  return CATEGORY_ORDER.some((item) => item === value);
}

function isEnergy(value: string): value is Energy {
  return ENERGY_ORDER.some((item) => item === value);
}

export function TaskFormSheet({
  task,
  defaultEstimateMin,
  onClose,
  onSave,
  onDelete,
}: TaskFormSheetProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [estimate, setEstimate] = useState(
    String(task?.estimateMin ?? defaultEstimateMin),
  );
  const [category, setCategory] = useState<Category>(task?.category ?? 'create');
  const [energy, setEnergy] = useState<Energy>(task?.energy ?? 'mid');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canSave = title.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    const parsed = Number(estimate);
    const estimateMin =
      estimate.trim() === '' || !Number.isFinite(parsed)
        ? defaultEstimateMin
        : clamp(Math.round(parsed), 5, 240);
    onSave({ title: title.trim(), estimateMin, category, energy });
  }

  function handleCategory(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (isCategory(value)) setCategory(value);
  }

  function handleEnergy(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (isEnergy(value)) setEnergy(value);
  }

  function handleDelete() {
    if (!task || !onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete(task.id);
  }

  const footer = (
    <div className="collect-sheet-actions">
      {task && onDelete ? (
        <button
          className={`btn btn--ghost collect-delete${confirmingDelete ? ' is-confirming' : ''}`}
          type="button"
          onClick={handleDelete}
        >
          <Icon name="trash" size={14} />
          {confirmingDelete ? '确认删除' : '删除'}
        </button>
      ) : null}
      <button
        className="btn btn--primary collect-save"
        type="submit"
        form={FORM_ID}
        disabled={!canSave}
      >
        保存
      </button>
    </div>
  );

  return (
    <Sheet
      open
      title={task ? '编辑这件事' : '记一件事'}
      onClose={onClose}
      footer={footer}
    >
      <form id={FORM_ID} className="collect-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="collect-task-title">事情</label>
          <input
            id="collect-task-title"
            className="input"
            type="text"
            value={title}
            maxLength={120}
            placeholder="比如：回复合作邀约邮件"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="collect-task-estimate">预估时长（分钟）</label>
          <input
            id="collect-task-estimate"
            className="input"
            type="number"
            inputMode="numeric"
            min={5}
            max={240}
            step={5}
            value={estimate}
            onChange={(event) => setEstimate(event.target.value)}
          />
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="collect-task-category">类别</label>
            <select
              id="collect-task-category"
              className="select"
              value={category}
              onChange={handleCategory}
            >
              {CATEGORY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_META[item].label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="collect-task-energy">精力</label>
            <select
              id="collect-task-energy"
              className="select"
              value={energy}
              onChange={handleEnergy}
            >
              {ENERGY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {ENERGY_META[item].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="collect-form-hint">
          {canSave ? '写一句就够了，时长和分类之后都能改。' : '先写一句要做什么，保存就会亮起来。'}
        </p>
      </form>
    </Sheet>
  );
}
