import { useEffect, useState, type FormEvent } from 'react';
import type { Settings } from '../../types';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { formatHours, minutesToTime, timeToMinutes } from '../../lib/format';
import { useApp } from '../../store/AppProvider';
import './settings.css';

const FORM_ID = 'settings-form';

interface SettingsDraft {
  name: string;
  capacity: string;
  buffer: string;
  dayStart: string;
  dayEnd: string;
  defaultEstimate: string;
}

function toDraft(settings: Settings): SettingsDraft {
  return {
    name: settings.name,
    capacity: String(settings.capacityMin),
    buffer: String(Math.round(settings.bufferRatio * 100)),
    dayStart: minutesToTime(settings.dayStartMin),
    dayEnd: minutesToTime(settings.dayEndMin),
    defaultEstimate: String(settings.defaultEstimateMin),
  };
}

export default function SettingsSheet() {
  const { settingsOpen, closeSettings, state, updateSettings, resetDemo } = useApp();
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(state.settings));
  const [error, setError] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return;
    setDraft(toDraft(state.settings));
    setError('');
    setConfirmingReset(false);
  }, [settingsOpen, state.settings]);

  function updateDraft(patch: Partial<SettingsDraft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
    if (error) setError('');
  }

  const capacityValue = Number(draft.capacity);
  const capacityHours =
    Number.isFinite(capacityValue) && capacityValue > 0
      ? `${formatHours(capacityValue)} 小时`
      : '待填写';
  const bufferValue = Number(draft.buffer);
  const bufferLabel = Number.isFinite(bufferValue) ? `${Math.round(bufferValue)}%` : '—';
  const startMinutes = timeToMinutes(draft.dayStart);
  const endMinutes = timeToMinutes(draft.dayEnd);
  const spanHours =
    draft.dayStart && draft.dayEnd && endMinutes > startMinutes
      ? `${formatHours(endMinutes - startMinutes)} 小时`
      : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const capacity = Number(draft.capacity);
    const buffer = Number(draft.buffer);
    const defaultEstimate = Number(draft.defaultEstimate);

    if (!Number.isFinite(capacity) || capacity < 60 || capacity > 720) {
      setError('每日容量需要填 60–720 分钟。');
      return;
    }
    if (!Number.isFinite(buffer) || buffer < 10 || buffer > 40) {
      setError('留白比例需要在 10%–40% 之间。');
      return;
    }
    if (!Number.isFinite(defaultEstimate) || defaultEstimate < 5 || defaultEstimate > 240) {
      setError('默认预估需要在 5–240 分钟之间。');
      return;
    }
    if (!draft.dayStart || !draft.dayEnd) {
      setError('开始和结束时间都要填。');
      return;
    }
    if (endMinutes <= startMinutes) {
      setError('结束时间需要晚于开始时间。');
      return;
    }

    updateSettings({
      name: draft.name.trim() || state.settings.name,
      capacityMin: Math.round(capacity),
      bufferRatio: Math.round(buffer) / 100,
      dayStartMin: startMinutes,
      dayEndMin: endMinutes,
      defaultEstimateMin: Math.round(defaultEstimate),
    });
    closeSettings();
  }

  const footer = (
    <div className="settings-foot">
      {error ? (
        <p className="settings-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn--primary btn--block settings-save" type="submit" form={FORM_ID}>
        保存设置
      </button>
      <p className="settings-version">v0.1.0 · 数据仅保存在本机</p>
    </div>
  );

  return (
    <Sheet open={settingsOpen} title="设置" onClose={closeSettings} footer={footer}>
      <form id={FORM_ID} className="settings-form" onSubmit={handleSubmit} noValidate>
        <section className="settings-section" aria-label="关于你">
          <p className="section-label">关于你</p>
          <div className="field">
            <label htmlFor="settings-name">昵称</label>
            <input
              id="settings-name"
              className="input"
              type="text"
              maxLength={24}
              value={draft.name}
              placeholder="怎么称呼你"
              onChange={(event) => updateDraft({ name: event.target.value })}
            />
          </div>
        </section>

        <section className="settings-section" aria-label="一天的节奏">
          <p className="section-label">
            一天的节奏
            <span className="section-label__meta">
              {spanHours ? `共 ${spanHours}` : '时间范围'}
            </span>
          </p>

          <div className="field">
            <div className="settings-label-row">
              <label className="settings-field-label" htmlFor="settings-capacity">
                每日容量
              </label>
              <span className="settings-value">{capacityHours}</span>
            </div>
            <div className="settings-input">
              <input
                id="settings-capacity"
                className="input"
                type="number"
                inputMode="numeric"
                min={60}
                max={720}
                step={15}
                value={draft.capacity}
                onChange={(event) => updateDraft({ capacity: event.target.value })}
              />
              <span className="settings-input__unit">分钟</span>
            </div>
            <p className="settings-hint">先按能稳定兑现的量来，超出的部分交给留白。</p>
          </div>

          <div className="field">
            <div className="settings-label-row">
              <label className="settings-field-label" htmlFor="settings-buffer">
                留白比例
              </label>
              <span className="settings-value">{bufferLabel}</span>
            </div>
            <input
              id="settings-buffer"
              className="settings-range"
              type="range"
              min={10}
              max={40}
              step={1}
              value={draft.buffer}
              aria-valuetext={`留白 ${bufferLabel}`}
              onChange={(event) => updateDraft({ buffer: event.target.value })}
            />
            <div className="settings-range-scale">
              <span>10%</span>
              <span>40%</span>
            </div>
          </div>

          <div className="field-grid settings-times">
            <div className="field">
              <label htmlFor="settings-start">开始</label>
              <input
                id="settings-start"
                className="input"
                type="time"
                value={draft.dayStart}
                onChange={(event) => updateDraft({ dayStart: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="settings-end">结束</label>
              <input
                id="settings-end"
                className="input"
                type="time"
                value={draft.dayEnd}
                onChange={(event) => updateDraft({ dayEnd: event.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="settings-section" aria-label="新任务默认值">
          <p className="section-label">新任务默认值</p>
          <div className="field">
            <div className="settings-label-row">
              <label className="settings-field-label" htmlFor="settings-estimate">
                默认预估
              </label>
              <span className="settings-value">
                {draft.defaultEstimate ? `${draft.defaultEstimate} 分钟` : '—'}
              </span>
            </div>
            <div className="settings-input">
              <input
                id="settings-estimate"
                className="input"
                type="number"
                inputMode="numeric"
                min={5}
                max={240}
                step={5}
                value={draft.defaultEstimate}
                onChange={(event) => updateDraft({ defaultEstimate: event.target.value })}
              />
              <span className="settings-input__unit">分钟</span>
            </div>
            <p className="settings-hint">收集箱里新建任务时，会先填这个时长。</p>
          </div>
        </section>

        <section className="settings-danger" aria-label="重置演示数据">
          <div className="settings-danger__head">
            <div>
              <p className="settings-danger__title">重置演示数据</p>
              <p className="settings-danger__text">
                {confirmingReset
                  ? '会清空这台设备上的任务、计划、复盘和设置。'
                  : '回到最初的样子，清空本机所有记录。'}
              </p>
            </div>
            {confirmingReset ? null : (
              <button
                className="btn btn--ghost btn--sm settings-danger__trigger"
                type="button"
                onClick={() => setConfirmingReset(true)}
              >
                <Icon name="refresh" size={13} />
                重置
              </button>
            )}
          </div>
          {confirmingReset ? (
            <div className="settings-danger__confirm">
              <p className="settings-danger__warn">确认后无法撤销，请再点一次确认。</p>
              <div className="settings-danger__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                >
                  取消
                </button>
                <button
                  className="btn btn--sm settings-danger__confirm-btn"
                  type="button"
                  onClick={resetDemo}
                >
                  确认重置
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </form>
    </Sheet>
  );
}
