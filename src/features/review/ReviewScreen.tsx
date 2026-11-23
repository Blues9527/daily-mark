import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { REVIEW_REASONS } from '../../lib/review';
import { dateLabel } from '../../lib/date';
import { useApp } from '../../store/AppProvider';
import { CategoryCompare } from './CategoryCompare';
import { ReviewScoreCard } from './ReviewScoreCard';
import { SuggestionCard } from './SuggestionCard';
import './review.css';

const MAX_REASONS = 2;
const NOTE_LIMIT = 200;

export default function ReviewScreen() {
  const { state, now, todayRecord, todayReview, suggestion, saveReview, go } = useApp();
  const [reasons, setReasons] = useState<string[]>(todayReview?.reasons ?? []);
  const [note, setNote] = useState(todayReview?.note ?? '');
  const [accepted, setAccepted] = useState(
    Boolean(todayReview?.acceptedSuggestion && suggestion),
  );

  const reviewed = Boolean(todayReview);
  const hasPlan = todayRecord.totalTasks > 0 || todayRecord.plannedMin > 0;
  const reasonsAtLimit = reasons.length >= MAX_REASONS;
  const inProgress = !reviewed && now.getHours() < 18;

  function toggleReason(reason: string) {
    setReasons((previous) => {
      if (previous.includes(reason)) {
        return previous.filter((item) => item !== reason);
      }
      if (previous.length >= MAX_REASONS) return previous;
      return [...previous, reason];
    });
  }

  function handleSave() {
    const useSuggestion = accepted && suggestion !== null;
    saveReview({
      reasons,
      note,
      acceptedSuggestion: useSuggestion,
      tomorrowCapacityMin:
        accepted && suggestion ? suggestion.suggestedMin : null,
    });
  }

  const saveLabel = reviewed
    ? '更新今天的复盘'
    : inProgress
      ? '记下当前进度'
      : hasPlan
        ? '收下今天'
        : '记下今天';
  const reasonHint =
    reasons.length === 0
      ? '不选也能保存，挑一个最接近的原因就好。'
      : reasonsAtLimit
        ? '已选两个，再点一次可以取消。'
        : '还能再选一个，或者直接往下。';

  return (
    <div className="screen review">
      <header className="rv-head">
        <div className="rv-head-main">
          <div className="rv-title-row">
            <h1 className="title-lg">今日复盘</h1>
            {reviewed ? (
              <span className="pill pill--green rv-reviewed">
                <Icon name="check" size={10} />
                已复盘
              </span>
            ) : null}
          </div>
          <p className="rv-date">{dateLabel(now)} · 60 秒对账</p>
        </div>
        <span className="pill pill--accent rv-streak">
          <Icon name="spark" size={11} />
          连续 {state.streak} 天
        </span>
      </header>

      {inProgress ? (
        <p className="rv-progress-note">
          <Icon name="clock" size={11} />
          今天还在进行中，这里只是当前进度；晚上再来用 60 秒收尾。
        </p>
      ) : null}

      <ReviewScoreCard
        record={todayRecord}
        reviewed={reviewed}
        inProgress={inProgress}
        onPlan={() => go('plan')}
      />

      {hasPlan ? <CategoryCompare record={todayRecord} /> : null}

      {hasPlan ? (
        <section className="rv-block" aria-label="偏航原因">
          <div className="rv-block__head">
            <h2 className="rv-block__title">{inProgress ? '如果今天有偏差' : '为什么有偏差'}</h2>
            <span className="rv-block__meta">
              最多 2 个 · {reasons.length}/{MAX_REASONS}
            </span>
          </div>
          <div className="rv-reasons" role="group" aria-label="选择偏航原因">
            {REVIEW_REASONS.map((reason) => {
              const active = reasons.includes(reason);
              const locked = !active && reasonsAtLimit;
              return (
                <button
                  key={reason}
                  className={`chip${active ? ' chip--accent chip--active' : ''}`}
                  type="button"
                  aria-pressed={active}
                  disabled={locked}
                  onClick={() => toggleReason(reason)}
                >
                  {reason}
                </button>
              );
            })}
          </div>
          <p className="rv-reasons-hint">{reasonHint}</p>
        </section>
      ) : null}

      {suggestion ? (
        <SuggestionCard
          suggestedMin={suggestion.suggestedMin}
          reason={suggestion.reason}
          accepted={accepted}
          onAccept={() => setAccepted(true)}
        />
      ) : null}

      <section className="rv-block rv-note-block">
        <div className="rv-block__head">
          <h2 className="rv-block__title">今天最值得保留的一件事</h2>
          <span className="rv-block__meta">
            {note.length}/{NOTE_LIMIT}
          </span>
        </div>
        <textarea
          id="review-note"
          className="textarea rv-note"
          value={note}
          maxLength={NOTE_LIMIT}
          aria-label="今天最值得保留的一件事"
          placeholder="写一句就好，给明天的自己。"
          onChange={(event) => setNote(event.target.value)}
        />
      </section>

      <div className="rv-submit">
        <button className="btn btn--accent btn--block" type="button" onClick={handleSave}>
          <Icon name="check" size={16} />
          {saveLabel}
        </button>
        <p className="rv-submit-note">
          {reviewed ? '再保存会更新今天的记录，不会多算一天。' : '复盘只保存在本机，不会公开。'}
        </p>
      </div>
    </div>
  );
}
