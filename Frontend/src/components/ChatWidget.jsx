import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../services/api';
import '../styles/ChatWidget.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '¡Hola! 👋 Soy el asistente virtual. ¿En qué puedo ayudarte hoy?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll a último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus en input cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/chatbot/message`, {
        message: inputText,
        sender_id: sessionId,
      });

      // Procesar respuestas de Rasa (pueden ser múltiples)
      const botMessages = data.map((resp, index) => ({
        id: Date.now() + index + 1,
        text: resp.response,
        sender: 'bot',
        timestamp: new Date(),
        confidence: resp.confidence,
        intent: resp.intent,
      }));

      setMessages((prev) => [...prev, ...botMessages]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: 'Lo siento, hubo un problema. Por favor intenta nuevamente.',
          sender: 'bot',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const QuickActions = () => (
    <div className="quick-actions">
      <button
        className="quick-action-btn"
        onClick={() => {
          setInputText('¿Cuáles son los tiempos de entrega?');
          inputRef.current?.focus();
        }}
      >
        📦 Envíos
      </button>
      <button
        className="quick-action-btn"
        onClick={() => {
          setInputText('¿Qué medios de pago aceptan?');
          inputRef.current?.focus();
        }}
      >
        💳 Pagos
      </button>
      <button
        className="quick-action-btn"
        onClick={() => {
          setInputText('Quiero consultar mi pedido');
          inputRef.current?.focus();
        }}
      >
        📋 Mi pedido
      </button>
    </div>
  );

  return (
    <>
      {/* Botón flotante para abrir/cerrar chat */}
      <button
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label="Abrir chat"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
        {!isOpen && <span className="notification-badge">💬</span>}
      </button>

      {/* Widget de chat */}
      <div className={`chat-widget ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">🤖</div>
            <div>
              <h3 className="chat-title">Asistente Virtual</h3>
              <span className="chat-status">
                <span className="status-dot"></span> En línea
              </span>
            </div>
          </div>
          <button className="chat-close-btn" onClick={toggleChat} aria-label="Cerrar chat">
            ✕
          </button>
        </div>

        {/* Mensajes */}
        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'message-user' : 'message-bot'} ${
                message.isError ? 'message-error' : ''
              }`}
            >
              <div className="message-content">
                <p className="message-text">{message.text}</p>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message message-bot">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Acciones rápidas (solo si hay pocos mensajes) */}
        {messages.length <= 2 && <QuickActions />}

        {/* Input */}
        <div className="chat-input-container">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Escribe tu mensaje..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
            aria-label="Enviar mensaje"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Footer */}
        <div className="chat-footer">
          <small>Powered by IA • Siempre aquí para ayudarte</small>
        </div>
      </div>
    </>
  );
};

export default ChatWidget;
