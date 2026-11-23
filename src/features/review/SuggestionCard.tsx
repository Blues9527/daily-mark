import { Icon } from '../../components/Icon';
import { formatHours } from '../../lib/format';

interface SuggestionCardProps {
  suggestedMin: number;
  reason: string;
  accepted: boolean;
  onAccept: () => void;
}

export function SuggestionCard({
  suggestedMin,
  reason,
  accepted,
  onAccept,
}: SuggestionCardProps) {
  return (
    <section
      className={`rv-suggest${accepted ? ' is-accepted' : ''}`}
      aria-label="明日容量建议"
    >
      <div className="rv-suggest__head">
        <p className="rv-suggest__title">
          明天把容量降到 {formatHours(suggestedMin)} 小时？
        </p>
        {accepted ? <span className="pill pill--green rv-suggest__pill">已接受</span> : null}
      </div>
      <p className="rv-suggest__text">{reason}</p>
      {accepted ? (
        <p className="rv-suggest__done">
          <Icon name="check" size={13} />
          已记下，明天先按 {formatHours(suggestedMin)} 小时试。
        </p>
      ) : (
        <button className="btn btn--accent btn--sm" type="button" onClick={onAccept}>
          接受这个建议
        </button>
      )}
    </section>
  );
}
