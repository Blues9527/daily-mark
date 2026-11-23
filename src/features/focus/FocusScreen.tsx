import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { CATEGORY_META, ENERGY_META } from '../../data/constants';
import {
  focusElapsedSeconds,
  focusProgress,
  focusRemainingSeconds,
} from '../../lib/focus';
import { minutesToTime } from '../../lib/format';
import { useApp } from '../../store/AppProvider';
import { DistractionCatcher } from './DistractionCatcher';
import { FocusRing } from './FocusRing';
import { PartialCompleteSheet } from './PartialCompleteSheet';
import './focus.css';

export default function FocusScreen() {
  const { state, focusBlock, focusTask, closeFocus, toggleFocusPause, completeFocus } = useApp();
  const [tick, setTick] = useState(() => new Date());
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialInitial, setPartialInitial] = useState(30);
  const session = state.focus;

  useEffect(() => {
    if (!session) return;
    setTick(new Date());
    const timer = window.setInterval(() => setTick(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  if (!session || !focusBlock) {
    return (
      <div className="screen focus-screen focus-screen-empty">
        <div className="focus-empty">
          <p className="focus-empty-eyebrow">FOCUS</p>
          <h1 className="focus-empty-title">现在没有正在专注的块</h1>
          <p className="focus-empty-text">
            回到今日，在时间轴上点播放键，就能进入一段只做一件事的时间。
          </p>
          <button className="focus-empty-btn" type="button" onClick={closeFocus}>
            回到今日
          </button>
        </div>
      </div>
    );
  }

  const plannedMin = Math.max(1, focusBlock.endMin - focusBlock.startMin);
  const elapsedSec = focusElapsedSeconds(session, tick);
  const remainingSec = focusRemainingSeconds(session, tick, plannedMin);
  const progress = focusProgress(session, tick, plannedMin);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const paused = session.paused;
  const title = focusTask?.title ?? focusBlock.title;
  const categoryMeta = focusTask ? CATEGORY_META[focusTask.category] : null;
  const energyLabel = focusTask ? ENERGY_META[focusTask.energy].label : null;

  function openPartial() {
    const seconds = focusElapsedSeconds(state.focus, new Date());
    const suggestion = Math.min(
      plannedMin,
      Math.max(1, Math.round(seconds / 60) || 30),
    );
    setPartialInitial(suggestion);
    setPartialOpen(true);
  }

  function confirmPartial(minutes: number) {
    setPartialOpen(false);
    completeFocus('partial', minutes);
  }

  return (
    <div className="screen focus-screen">
      <div className="focus-inner">
        <header className="focus-top">
          <button
            className="focus-back"
            type="button"
            aria-label="退出专注，回到今日"
            onClick={closeFocus}
          >
            <Icon name="arrowLeft" size={20} />
          </button>
          <span className={`focus-state${paused ? ' is-paused' : ''}`}>
            <i aria-hidden="true" />
            {paused ? '已暂停' : '专注中'}
          </span>
        </header>

        <div className="focus-heading">
          <p className="focus-kicker">
            {minutesToTime(focusBlock.startMin)} – {minutesToTime(focusBlock.endMin)}
          </p>
          <h1 className="focus-title">{title}</h1>
          <p className="focus-sub">这一块只做这件事。其他的，先放在旁边。</p>
          <div className="focus-tags">
            {categoryMeta ? (
              <span className="focus-tag">
                <i aria-hidden="true" style={{ background: categoryMeta.color }} />
                {categoryMeta.label}
              </span>
            ) : (
              <span className="focus-tag">
                <i aria-hidden="true" style={{ background: '#e98a63' }} />
                仪式时间
              </span>
            )}
            {energyLabel ? <span className="focus-tag">{energyLabel}</span> : null}
          </div>
        </div>

        <FocusRing remainingSec={remainingSec} progress={progress} paused={paused} />
        <div className="focus-meta">
          <span>
            计划 <b>{plannedMin} 分钟</b>
          </span>
          <span>
            已专注 <b>{elapsedMin} 分钟</b>
          </span>
        </div>

        <div className="focus-actions">
          <button
            className="focus-action focus-action-pause"
            type="button"
            onClick={toggleFocusPause}
          >
            <Icon name={paused ? 'play' : 'pause'} size={14} />
            {paused ? '继续' : '暂停'}
          </button>
          <button
            className="focus-action focus-action-done"
            type="button"
            onClick={() => completeFocus('done')}
          >
            <Icon name="check" size={16} />
            完成本段
          </button>
        </div>
        <button className="focus-partial-btn" type="button" onClick={openPartial}>
          部分完成 · 记录实际分钟
        </button>

        <DistractionCatcher blockId={focusBlock.id} />

        <p className="focus-foot">结束后自动记账 · 退出不会丢失计时</p>
      </div>

      <PartialCompleteSheet
        open={partialOpen}
        initialMinutes={partialInitial}
        elapsedMin={elapsedMin}
        plannedMin={plannedMin}
        onClose={() => setPartialOpen(false)}
        onConfirm={confirmPartial}
      />
    </div>
  );
}
