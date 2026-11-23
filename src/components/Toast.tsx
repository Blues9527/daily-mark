import { useApp } from '../store/AppProvider';

export function Toast() {
  const { toastMessage, screen } = useApp();
  const immersive = screen === 'plan' || screen === 'focus';

  return (
    <div
      className={`toast${toastMessage ? ' toast--show' : ''}${immersive ? ' toast--immersive' : ''}`}
      role="status"
      aria-live="polite"
    >
      {toastMessage}
    </div>
  );
}
