import { ArrowUp, Bot, LoaderCircle, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const initialMessages = [{
  id: 'welcome',
  role: 'assistant',
  content: 'Hola. Puedo ayudarte a ordenar tu día, crear recordatorios o revisar lo que tienes pendiente.'
}];

const messageId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

export const ChatPanel = ({ onSend, selectedDate }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const sendMessage = async event => {
    event.preventDefault();
    const message = text.trim();
    if (!message || sending) return;

    setError('');
    setText('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setMessages(current => [...current, { id: messageId(), role: 'user', content: message }]);
    setSending(true);
    try {
      const result = await onSend(message);
      setMessages(current => [...current, {
        id: messageId(),
        role: 'assistant',
        content: result.reply || 'Listo.'
      }]);
    } catch (err) {
      setError(err.message || 'No pude completar la solicitud. Inténtalo de nuevo.');
      setMessages(current => current.slice(0, -1));
      setText(message);
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="chat-panel" aria-labelledby="conversation-title">
      <header className="chat-heading">
        <div className="chat-heading-copy">
          <p className="eyebrow">Tu espacio personal</p>
          <h1 id="conversation-title" className="font-display">¿Qué tenemos entre manos?</h1>
          <p className="chat-date">{selectedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <span className="assistant-seal" aria-label="Asistente disponible"><Sparkles size={17} /></span>
      </header>

      <div className="chat-scroll" role="log" aria-live="polite" aria-label="Conversación con el asistente">
        <div className="conversation-inner">
          {messages.map(message => (
            <article key={message.id} className={`message message-${message.role} message-enter`}>
              {message.role === 'assistant' ? <span className="message-avatar"><Bot size={16} /></span> : null}
              <p>{message.content}</p>
            </article>
          ))}
          {sending ? (
            <div className="message message-assistant" role="status">
              <span className="message-avatar"><Bot size={16} /></span>
              <p className="processing"><LoaderCircle size={15} className="animate-spin" /> Pensando en ello…</p>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      <div className="composer-wrap">
        {error ? <p className="composer-error" role="alert">{error}</p> : null}
        <form className="composer" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="assistant-message">Escribe un mensaje</label>
          <textarea
            id="assistant-message"
            ref={inputRef}
            value={text}
            maxLength={2000}
            rows={1}
            placeholder="Escribe algo para tu día…"
            onChange={event => {
              setText(event.target.value);
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`;
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            className="send-button"
            disabled={!text.trim() || sending}
            aria-label={sending ? 'Procesando mensaje' : 'Enviar mensaje'}
            aria-busy={sending}
          >{sending ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowUp size={19} />}</button>
        </form>
        <p className="composer-note">Enter para enviar · Shift + Enter para nueva línea</p>
      </div>
    </section>
  );
};
