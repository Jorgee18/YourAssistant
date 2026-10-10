import { CalendarDays, LogOut, Settings2, UserRound, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarPanel } from '../components/CalendarPanel.jsx';
import { ChatPanel } from '../components/ChatPanel.jsx';
import { MobileNav } from '../components/MobileNav.jsx';
import { ReminderPanel } from '../components/ReminderPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getAdminAccess } from '../services/admin.api.js';
import { sendAssistantMessage } from '../services/assistant.api.js';
import {
  getReminders,
  setReminderNotificationOffset,
  setReminderStatus
} from '../services/reminders.api.js';
import { formatMonth, monthRange } from '../utils/dates.js';

export const WorkspacePage = () => {
  const { session, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const reminderDate = new Date(searchParams.get('at') || NaN);
  const initialDate = Number.isNaN(reminderDate.getTime()) ? new Date() : reminderDate;
  const [month, setMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [activeMobileSection, setActiveMobileSection] = useState(() => (
    searchParams.get('section') === 'tasks' ? 'tasks' : 'chat'
  ));
  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [reminderError, setReminderError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [busyOffsetId, setBusyOffsetId] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateConnectivity = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnectivity);
    window.addEventListener('offline', updateConnectivity);
    return () => {
      window.removeEventListener('online', updateConnectivity);
      window.removeEventListener('offline', updateConnectivity);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const { from, to } = monthRange(month);
    setLoadingReminders(true);
    setReminderError('');
    getReminders(from, to)
      .then(result => { if (active) setReminders(result.reminders); })
      .catch(error => { if (active) setReminderError(error.message); })
      .finally(() => { if (active) setLoadingReminders(false); });
    return () => { active = false; };
  }, [month, refreshVersion, session?.token]);

  useEffect(() => {
    let active = true;
    getAdminAccess()
      .then(result => { if (active) setIsAdmin(result.isAdmin); })
      .catch(() => { if (active) setIsAdmin(false); });
    return () => { active = false; };
  }, [session?.token]);

  const changeMonth = offset => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(next);
  };

  const handleSend = async message => {
    const result = await sendAssistantMessage(message);
    setRefreshVersion(version => version + 1);
    return result;
  };

  const handleStatusChange = async (id, status) => {
    setBusyId(id);
    setReminderError('');
    try {
      await setReminderStatus(id, status);
      setRefreshVersion(version => version + 1);
    } catch (error) {
      setReminderError(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleNotificationOffsetChange = async (id, notificationOffsetMinutes) => {
    setBusyOffsetId(id);
    setReminderError('');
    try {
      await setReminderNotificationOffset(id, notificationOffsetMinutes);
      setRefreshVersion(version => version + 1);
    } catch (error) {
      setReminderError(error.message);
    } finally {
      setBusyOffsetId(null);
    }
  };

  const tabClass = id => activeMobileSection === id ? '' : 'mobile-hidden';

  return (
    <div className="app-frame">
      <header className="topbar">
        <Link to="/" className="brand-lockup" aria-label="YourAssistant, inicio">
          <span className="brand-glyph">Y<span>.</span></span>
          <span>YourAssistant</span>
        </Link>
        <div className="topbar-date"><CalendarDays size={16} /><span>{formatMonth(month)}</span></div>
        <div className="topbar-actions">
          {!isOnline ? <span className="offline-status" role="status"><WifiOff size={14} />Offline</span> : null}
          {isAdmin ? <Link to="/admin" className="topbar-link"><Settings2 size={16} /><span>Modelos</span></Link> : null}
          <Link
            to="/profile"
            className="topbar-link profile-link"
            aria-label={`Abrir perfil de ${session?.user?.fullName || session?.user?.email || 'usuario'}`}
            title="Mi perfil"
          >
            <UserRound size={16} />
            <span className="user-label">{session?.user?.fullName || session?.user?.email}</span>
          </Link>
          <button type="button" className="icon-button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={17} /></button>
        </div>
      </header>

      <main className="workspace-grid">
        <div className={`workspace-pane ${tabClass('calendar')}`}>
          <CalendarPanel
            date={month}
            selectedDate={selectedDate}
            reminders={reminders}
            onSelectDate={setSelectedDate}
            onChangeMonth={changeMonth}
          />
        </div>
        <div className={`workspace-pane ${tabClass('chat')}`}>
          <ChatPanel onSend={handleSend} selectedDate={selectedDate} />
        </div>
        <div className={`workspace-pane ${tabClass('tasks')}`}>
          <ReminderPanel
            reminders={reminders}
            loading={loadingReminders}
            error={reminderError}
            busyId={busyId}
            busyOffsetId={busyOffsetId}
            highlightedReminderId={searchParams.get('reminderId')}
            onStatusChange={handleStatusChange}
            onOffsetChange={handleNotificationOffsetChange}
            onRetry={() => setRefreshVersion(version => version + 1)}
          />
        </div>
      </main>

      <MobileNav active={activeMobileSection} onChange={setActiveMobileSection} />
    </div>
  );
};
