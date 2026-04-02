// Calendar — a simple monthly calendar widget.
// Props:
//   onDateSelect(dateStr) — called when the user clicks a day cell.
//                           dateStr format: "YYYY-MM-DD"
//   selectedDate          — currently highlighted date string (controlled by parent)
//
// The calendar starts on the current month.  ‹ / › buttons navigate months.
import React, { useState } from 'react';
import './Calender.css';

// Column headers — Sunday through Saturday
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const Calendar = ({ onDateSelect, selectedDate }) => {
  const today = new Date();

  // Which month/year is currently displayed (not necessarily today's)
  const [viewYear, setViewMonth_year] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based

  // Human-readable month name, e.g. "April"
  const monthName = new Date(viewYear, viewMonth, 1)
    .toLocaleString('default', { month: 'long' });

  // Number of days in the displayed month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Which weekday (0 = Sun) the 1st of this month falls on
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  // ── Month navigation ──
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewMonth_year(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewMonth_year(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Build the flat list of cells that fill the 7-column grid ──
  const cells = [];

  // Day-of-week header labels (S M T W T F S)
  DAY_LABELS.forEach((d, i) => (
    cells.push(
      <div key={`lbl-${i}`} className="cal-day-label">{d}</div>
    )
  ));

  // Empty spacer cells before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-day cal-day--empty" />);
  }

  // One cell per day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = selectedDate === dateStr;

    cells.push(
      <div
        key={day}
        className={`cal-day${isToday ? ' cal-day--today' : ''}${isSelected ? ' cal-day--selected' : ''}`}
        onClick={() => onDateSelect(dateStr)}
        title={dateStr}
      >
        <span className="cal-day-num">{day}</span>
      </div>
    );
  }

  return (
    <div className="cal-outer">
      {/* Decorative binding tabs at the top of the card */}
      <div className="cal-tabs">
        <div className="cal-tab" />
        <div className="cal-tab" />
      </div>

      <div className="cal-card">
        {/* Red header: prev arrow · Month Year · next arrow */}
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <span className="cal-header-label">{monthName} {viewYear}</span>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>

        {/* Cream body containing the 7-column day grid */}
        <div className="cal-body">
          <div className="cal-grid">{cells}</div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
