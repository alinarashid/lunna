// Todolist — reusable to-do list component with two operating modes:
//
//   bentoMode = false  (standalone / self-managed)
//     The component owns its own task list in local state.
//     Tasks are persisted to localStorage under the key "tasks-YYYY-MM-DD".
//     When `selectedDate` changes, the saved list for that date is loaded.
//
//   bentoMode = true  (controlled by parent — used in MainApp)
//     Task state is lifted to the parent.  The component receives tasks and
//     calls onAdd / onToggle / onDelete to mutate them.
//
// Props:
//   selectedDate   — "YYYY-MM-DD" string; used as localStorage key in standalone mode
//   initialTasks   — seed list for standalone mode (default [])
//   bentoMode      — boolean, enables controlled mode
//   tasks          — (bentoMode) task array from parent
//   onAdd(title)   — (bentoMode) called with the new task title string
//   onToggle(id)   — (bentoMode) called with the task's numeric id
//   onDelete(id)   — (bentoMode) called with the task's numeric id
import React, { useState, useEffect } from 'react';
import './Todolist.css';

// ── Inline SVG arrow used inside the add button ──
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const Todolist = ({
  selectedDate,
  initialTasks = [],
  bentoMode,
  // Controlled-mode props (only used when bentoMode is true)
  tasks: externalTasks,
  onAdd: externalAdd,
  onToggle: externalToggle,
  onDelete: externalDelete,
}) => {
  // Internal task list — only used in standalone mode
  const [internalTasks, setInternalTasks] = useState(initialTasks);
  const [input, setInput] = useState('');

  // Always read from externalTasks in bentoMode; fall back to internal state
  const tasks = bentoMode ? (externalTasks ?? []) : internalTasks;

  // ── Standalone mode: reload tasks from localStorage when the date changes ──
  useEffect(() => {
    if (!bentoMode && selectedDate) {
      const saved = localStorage.getItem(`tasks-${selectedDate}`);
      setInternalTasks(saved ? JSON.parse(saved) : []);
    }
  }, [selectedDate, bentoMode]);

  // Helper: update internal state AND persist to localStorage
  const persist = (updated) => {
    setInternalTasks(updated);
    if (!bentoMode && selectedDate) {
      localStorage.setItem(`tasks-${selectedDate}`, JSON.stringify(updated));
    }
  };

  // Capitalise the first letter of a task title
  const capitalise = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // ── Action handlers — delegate to parent in bentoMode, otherwise self-manage ──
  const handleAdd = () => {
    if (!input.trim()) return;
    const title = capitalise(input.trim());
    if (bentoMode && externalAdd) {
      externalAdd(title);
    } else {
      persist([...internalTasks, { id: Date.now(), title, completed: false }]);
    }
    setInput('');
  };

  const handleToggle = (id) => {
    if (bentoMode && externalToggle) {
      externalToggle(id);
    } else {
      persist(internalTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    }
  };

  const handleDelete = (id) => {
    if (bentoMode && externalDelete) {
      externalDelete(id);
    } else {
      persist(internalTasks.filter(t => t.id !== id));
    }
  };

  return (
    <div className={`tdl-root${bentoMode ? ' tdl-root--bento' : ''}`}>
      <h2 className="tdl-heading">To do list:</h2>

      {/* ── Task list ── */}
      <ul className="tdl-list">
        {tasks.map(task => (
          <li key={task.id} className={`tdl-item${task.completed ? ' tdl-item--done' : ''}`}>
            {/* Circle toggle button — filled when completed */}
            <button className="tdl-toggle" onClick={() => handleToggle(task.id)}>
              <span className={`tdl-circle${task.completed ? ' tdl-circle--checked' : ''}`} />
            </button>

            <span className="tdl-title">{task.title}</span>

            {/* Delete button */}
            <button className="tdl-delete" onClick={() => handleDelete(task.id)}>✕</button>
          </li>
        ))}

        {/* Empty state message */}
        {tasks.length === 0 && (
          <li className="tdl-empty">no tasks yet!</li>
        )}
      </ul>

      {/* ── Add task input ── */}
      <div className="tdl-input-row">
        <input
          type="text"
          placeholder="type here.."
          value={input}
          onChange={e => {
            const v = e.target.value;
            setInput(v.charAt(0).toUpperCase() + v.slice(1));
          }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          className={`tdl-add-btn${input.trim() ? ' tdl-add-btn--visible' : ' tdl-add-btn--hidden'}`}
          onClick={handleAdd}
          disabled={!input.trim()}
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default Todolist;
