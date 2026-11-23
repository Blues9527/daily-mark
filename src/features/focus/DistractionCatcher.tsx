import { useState, type FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { useApp } from '../../store/AppProvider';
import type { DistractionType } from '../../types';

const TYPE_OPTIONS: { value: DistractionType; label: string }[] = [
  { value: 'idea', label: '想法' },
  { value: 'todo', label: '待办' },
  { value: 'feeling', label: '情绪' },
];

const TYPE_LABEL: Record<DistractionType, string> = {
  idea: '想法',
  todo: '待办',
  feeling: '情绪',
};

interface DistractionCatcherProps {
  blockId: string;
}

export function DistractionCatcher({ blockId }: DistractionCatcherProps) {
  const { state, captureDistraction, promoteDistraction } = useApp();
  const [text, setText] = useState('');
  const [type, setType] = useState<DistractionType>('idea');
  const pending = state.distractions.filter(
    (item) => item.blockId === blockId && !item.handled,
  );
  const trimmed = text.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) return;
    captureDistraction(trimmed, type);
    setText('');
  }

  return (
    <section className="focus-catcher" aria-label="走神捕手">
      <div className="focus-catcher-head">
        <h2 className="focus-catcher-title">走神了？先记下来</h2>
        <span className="focus-catcher-note">不计入中断</span>
      </div>
      <p className="focus-catcher-sub">想法、待办、情绪都可以。写完继续，不用现在处理。</p>
      <div className="focus-chips" role="group" aria-label="走神类型">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`focus-chip${type === option.value ? ' is-active' : ''}`}
            type="button"
            aria-pressed={type === option.value}
            onClick={() => setType(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <form className="focus-catch-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="focus-distraction-input">
          记录走神内容
        </label>
        <input
          id="focus-distraction-input"
          className="focus-catch-input"
          type="text"
          autoComplete="off"
          placeholder="刚刚想到…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button className="focus-catch-submit" type="submit" disabled={!trimmed}>
          记下
        </button>
      </form>
      {pending.length > 0 ? (
        <ul className="focus-catch-list">
          {pending.map((item) => (
            <li key={item.id} className="focus-catch-item">
              <div className="focus-catch-item-body">
                <span className="focus-catch-item-type">{TYPE_LABEL[item.type]}</span>
                <p className="focus-catch-item-text">{item.text}</p>
              </div>
              <button
                className="focus-catch-promote"
                type="button"
                onClick={() => promoteDistraction(item.id)}
              >
                <Icon name="plus" size={12} />
                转为任务
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
