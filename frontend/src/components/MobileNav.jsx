import { CalendarDays, CheckSquare2, MessageCircle } from 'lucide-react';

const sections = [
  { id: 'chat', label: 'Conversar', Icon: MessageCircle },
  { id: 'calendar', label: 'Calendario', Icon: CalendarDays },
  { id: 'tasks', label: 'Tareas', Icon: CheckSquare2 }
];

export const MobileNav = ({ active, onChange }) => (
  <nav className="mobile-nav" aria-label="Secciones principales">
    {sections.map(({ id, label, Icon }) => (
      <button
        key={id}
        type="button"
        className={`mobile-nav-item ${active === id ? 'mobile-nav-active' : ''}`}
        aria-current={active === id ? 'page' : undefined}
        onClick={() => onChange(id)}
      >
        <Icon size={19} aria-hidden="true" />
        <span>{label}</span>
      </button>
    ))}
  </nav>
);
