import { Icon } from '../../components/Icon';

export type PlanStep = 1 | 2 | 3;

const STEP_LABELS = ['01 清空大脑', '02 只留三件', '03 排进时间'];

interface PlanHeaderProps {
  step: PlanStep;
  onBack: () => void;
  onClose: () => void;
}

export function PlanHeader({ step, onBack, onClose }: PlanHeaderProps) {
  return (
    <header className="plan-head">
      <div className="plan-top">
        {step > 1 ? (
          <button
            className="icon-btn"
            type="button"
            aria-label="返回上一步"
            onClick={onBack}
          >
            <Icon name="arrowLeft" size={16} />
          </button>
        ) : (
          <span className="plan-top-spacer" aria-hidden="true" />
        )}
        <span className="plan-kicker">
          {step === 1 ? '晨间规划 · 90 秒' : `晨间规划 · 第 ${step} 步`}
        </span>
        <button
          className="icon-btn"
          type="button"
          aria-label="关闭晨间规划"
          onClick={onClose}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <ol className="plan-steps">
        {STEP_LABELS.map((label, index) => {
          const value = (index + 1) as PlanStep;
          const className = [
            'plan-step',
            value === step ? 'plan-step--active' : '',
            value < step ? 'plan-step--done' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li
              key={label}
              className={className}
              aria-current={value === step ? 'step' : undefined}
            >
              {label}
            </li>
          );
        })}
      </ol>
    </header>
  );
}
