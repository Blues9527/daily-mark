import { useApp } from '../store/AppProvider';
import { Icon, type IconName } from './Icon';
import type { ScreenId } from '../types';

const ITEMS: { screen: ScreenId; label: string; icon: IconName }[] = [
  { screen: 'today', label: '今日', icon: 'today' },
  { screen: 'collect', label: '收集', icon: 'inbox' },
  { screen: 'review', label: '复盘', icon: 'review' },
  { screen: 'stats', label: '统计', icon: 'stats' },
];

export function TabBar() {
  const { screen, go } = useApp();

  return (
    <nav className="tabbar" aria-label="主导航">
      {ITEMS.map((item) => {
        const active = screen === item.screen;
        return (
          <button
            key={item.screen}
            type="button"
            className={`tab${active ? ' tab--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => go(item.screen)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
