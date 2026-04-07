import { useState } from 'react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function Calendar({ selectedDate, onSelectDate }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build the grid: pad start with nulls, fill days
  const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function toIso(day) {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  }

  function isPast(day) {
    return new Date(viewYear, viewMonth, day) < today;
  }

  // Prevent navigating to months before today's month
  const atMin = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={prevMonth} disabled={atMin} className="cal-nav">‹</button>
        <span className="cal-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="cal-nav">›</button>
      </div>

      <div className="calendar-grid">
        {DAY_NAMES.map(d => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const iso     = toIso(day);
          const past    = isPast(day);
          const active  = selectedDate === iso;
          const isToday = new Date(viewYear, viewMonth, day).getTime() === today.getTime();
          return (
            <button
              key={iso}
              className={`cal-day ${past ? 'past' : ''} ${active ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              disabled={past}
              onClick={() => onSelectDate(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
