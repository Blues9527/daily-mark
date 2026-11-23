import { useEffect, useRef } from 'react';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { useApp } from './store/AppProvider';
import TodayScreen from './features/today/TodayScreen';
import CollectScreen from './features/collect/CollectScreen';
import PlanFlow from './features/plan/PlanFlow';
import FocusScreen from './features/focus/FocusScreen';
import ReviewScreen from './features/review/ReviewScreen';
import StatsScreen from './features/stats/StatsScreen';
import SettingsSheet from './features/settings/SettingsSheet';

export default function App() {
  const { screen } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const immersive = screen === 'plan' || screen === 'focus';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  return (
    <div className="app-frame">
      <div className={`app${immersive ? ' app--immersive' : ''}`}>
        <div className="app-scroll" ref={scrollRef}>
          <div key={screen} className="screen-enter">
            {screen === 'today' ? <TodayScreen /> : null}
            {screen === 'collect' ? <CollectScreen /> : null}
            {screen === 'plan' ? <PlanFlow /> : null}
            {screen === 'focus' ? <FocusScreen /> : null}
            {screen === 'review' ? <ReviewScreen /> : null}
            {screen === 'stats' ? <StatsScreen /> : null}
          </div>
        </div>
        {immersive ? null : <TabBar />}
        <SettingsSheet />
        <Toast />
      </div>
    </div>
  );
}
