import { useState } from 'react';
import type { Category } from '../../types';
import { CATEGORY_META, CATEGORY_ORDER, ENERGY_META } from '../../data/constants';
import { formatDuration } from '../../lib/format';
import { Icon } from '../../components/Icon';
import { useApp } from '../../store/AppProvider';
import { TaskFormSheet, type TaskDraftValues } from './TaskFormSheet';
import './collect.css';

type Filter = 'all' | Category;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  ...CATEGORY_ORDER.map((category) => ({
    value: category,
    label: CATEGORY_META[category].label,
  })),
];

export default function CollectScreen() {
  const {
    state,
    collectTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskDone,
    go,
  } = useApp();

  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCount = collectTasks.filter((task) => task.status !== 'done').length;
  const editingTask = editingId
    ? collectTasks.find((task) => task.id === editingId) ?? null
    : null;

  const filtered = collectTasks.filter(
    (task) => filter === 'all' || task.category === filter,
  );
  const ordered = [
    ...filtered.filter((task) => task.status !== 'done'),
    ...filtered.filter((task) => task.status === 'done'),
  ];

  function handleCreate(values: TaskDraftValues) {
    addTask(values);
    setFilter('all');
    setCreating(false);
  }

  function handleUpdate(values: TaskDraftValues) {
    if (editingTask) updateTask(editingTask.id, values);
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteTask(id);
    setEditingId(null);
  }

  function openCreate() {
    setEditingId(null);
    setCreating(true);
  }

  return (
    <div className="screen collect">
      <header className="collect-head">
        <div className="collect-head-text">
          <div className="collect-title-row">
            <h1 className="title-xl">收集箱</h1>
            <span className="collect-count">{openCount} 件未完成</span>
          </div>
          <p className="collect-sub">先记下来，晚点再决定</p>
        </div>
        <button
          className="icon-btn collect-add"
          type="button"
          aria-label="记一件事"
          onClick={openCreate}
        >
          <Icon name="plus" size={17} />
        </button>
      </header>

      <div className="chip-row chip-row--scroll collect-filters" role="group" aria-label="按类别筛选">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            className={`chip${filter === item.value ? ' chip--active' : ''}`}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {ordered.length > 0 ? (
        <>
          <ul className="collect-list">
            {ordered.map((task) => {
              const done = task.status === 'done';
              const meta = CATEGORY_META[task.category];
              return (
                <li key={task.id} className={`collect-row${done ? ' is-done' : ''}`}>
                  <button
                    className="collect-check"
                    type="button"
                    aria-pressed={done}
                    aria-label={
                      done
                        ? `把「${task.title}」标记为未完成`
                        : `完成「${task.title}」`
                    }
                    onClick={() => toggleTaskDone(task.id)}
                  >
                    <span className="collect-check-dot">
                      {done ? <Icon name="check" size={12} /> : null}
                    </span>
                  </button>
                  <button
                    className="collect-open"
                    type="button"
                    aria-label={`编辑「${task.title}」`}
                    onClick={() => setEditingId(task.id)}
                  >
                    <span className="collect-open-text">
                      <span className="collect-title">{task.title}</span>
                      <span className="collect-meta">
                        <span
                          className="collect-dot"
                          style={{ background: meta.color }}
                        />
                        {meta.label}
                        <span className="collect-sep">·</span>
                        {ENERGY_META[task.energy].label}
                      </span>
                    </span>
                    <span className="collect-time">
                      {formatDuration(task.estimateMin)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button className="collect-inline-add" type="button" onClick={openCreate}>
            <Icon name="plus" size={14} />
            再记一条
          </button>
        </>
      ) : (
        <div className="empty collect-empty">
          <p className="empty__title">
            {collectTasks.length === 0 ? '收集箱还是空的' : '这一类还没有事情'}
          </p>
          <p className="empty__text">
            {collectTasks.length === 0
              ? '想到什么就先放进来，不用马上安排。之后可以再决定，什么时候做也可以。'
              : '换个筛选看看，或者现在记一条。'}
          </p>
          <button className="btn btn--ghost" type="button" onClick={openCreate}>
            <Icon name="plus" size={14} />
            记一件
          </button>
        </div>
      )}

      <div className="collect-cta">
        <button
          className="btn btn--primary btn--block"
          type="button"
          onClick={() => go('plan')}
        >
          开始今日规划
          <Icon name="arrowRight" size={16} />
        </button>
        <p className="collect-tip">收集箱不是待办清单，它是你的缓冲区。</p>
      </div>

      {creating ? (
        <TaskFormSheet
          key="create"
          task={null}
          defaultEstimateMin={state.settings.defaultEstimateMin}
          onClose={() => setCreating(false)}
          onSave={handleCreate}
        />
      ) : null}

      {editingTask ? (
        <TaskFormSheet
          key={editingTask.id}
          task={editingTask}
          defaultEstimateMin={state.settings.defaultEstimateMin}
          onClose={() => setEditingId(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}
