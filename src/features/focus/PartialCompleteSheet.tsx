import { useEffect, useState } from 'react';
import { Sheet } from '../../components/Sheet';

const PRESETS = [15, 30, 45, 60];

interface PartialCompleteSheetProps {
  open: boolean;
  initialMinutes: number;
  elapsedMin: number;
  plannedMin: number;
  onClose: () => void;
  onConfirm: (minutes: number) => void;
}

export function PartialCompleteSheet({
  open,
  initialMinutes,
  elapsedMin,
  plannedMin,
  onClose,
  onConfirm,
}: PartialCompleteSheetProps) {
  const [value, setValue] = useState(String(initialMinutes));

  useEffect(() => {
    if (open) setValue(String(initialMinutes));
  }, [open, initialMinutes]);

  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= 1;
  const minutes = valid ? Math.round(parsed) : 0;

  function handleConfirm() {
    if (!valid) return;
    onConfirm(Math.round(parsed));
  }

  return (
    <Sheet
      open={open}
      title="部分完成"
      onClose={onClose}
      footer={
        <button
          className="btn btn--accent btn--block"
          type="button"
          onClick={handleConfirm}
          disabled={!valid}
        >
          {valid ? `记录 ${minutes} 分钟并结束` : '记录并结束本段'}
        </button>
      }
    >
      <p className="focus-sheet-lead">
        这一段实际推进了多久？已专注约 {elapsedMin} 分钟，计划 {plannedMin} 分钟。
      </p>
      <div className="focus-sheet-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            className={`focus-sheet-preset${Number(value) === preset ? ' is-active' : ''}`}
            type="button"
            onClick={() => setValue(String(preset))}
          >
            {preset} 分钟
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="focus-partial-input">实际分钟</label>
        <input
          id="focus-partial-input"
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <p className="focus-sheet-hint">按真实投入记录，剩余部分之后可以再安排。</p>
    </Sheet>
  );
}
