import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Minimize2, Sparkles } from 'lucide-react';

const BonusAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Bonus AI, your BDS Portal assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    // Mock AI Response logic
    setTimeout(() => {
      let response = "I'm not sure about that. I can help with school dates, results, and general navigation.";
      
      const lowerMsg = userMessage.toLowerCase();
      if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
        response = "Hi there! I'm ready to assist you with anything related to BDSPORTAL.";
      } else if (lowerMsg.includes('term') || lowerMsg.includes('date')) {
        response = "You can find academic term dates in the Content CMS under 'School Dates' if you're an admin, or check the 'Student Results' page for upcoming term info.";
      } else if (lowerMsg.includes('result')) {
        response = "Results are usually published by the admin. Once published, you can see them in the 'Results' tab of your dashboard.";
      } else if (lowerMsg.includes('cbt')) {
        response = "The Computer Based Test (CBT) system allows you to take exams online. Make sure you have a stable connection before starting.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="bonus-ai-container" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn-primary"
          style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            padding: 0,
            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
            animation: 'bounce 2s infinite'
          }}
        >
          <Sparkles size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="card-premium animate-in" style={{ 
          width: '380px', 
          height: '550px', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          maxWidth: 'calc(100vw - 60px)',
          maxHeight: 'calc(100vh - 60px)'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.25rem', 
            background: 'var(--primary)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'white', padding: '6px', borderRadius: '10px' }}>
                <Bot size={20} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>Bonus AI</h4>
                <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.7rem', fontWeight: 'bold' }}>Always Active</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <Minimize2 size={20} />
            </button>
          </div>

          {/* Messages area */}
          <div style={{ 
            flex: 1, 
            padding: '1.5rem', 
            overflowY: 'auto', 
            background: 'rgba(248, 250, 252, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{ 
                  maxWidth: '85%',
                  padding: '0.875rem 1rem',
                  borderRadius: msg.role === 'user' ? '1.25rem 1.25rem 0 1.25rem' : '0 1.25rem 1.25rem 1.25rem',
                  background: msg.role === 'user' ? 'var(--primary)' : 'white',
                  color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  lineHeight: '1.5'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', gap: '4px', padding: '10px' }}>
                <div className="typing-dot" style={{ width: '6px', height: '6px', background: '#cbd5e1', borderRadius: '50%', animation: 'bounce 1s infinite' }}></div>
                <div className="typing-dot" style={{ width: '6px', height: '6px', background: '#cbd5e1', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></div>
                <div className="typing-dot" style={{ width: '6px', height: '6px', background: '#cbd5e1', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSend} style={{ 
            padding: '1.25rem', 
            background: 'white', 
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '10px'
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              style={{ 
                flex: 1, 
                border: 'none', 
                background: 'var(--bg-tertiary)', 
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                fontSize: '0.875rem'
              }}
            />
            <button 
              type="submit"
              className="btn-primary"
              style={{ width: '45px', height: '45px', borderRadius: '1rem', padding: 0 }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .typing-dot {
          display: inline-block;
        }
      `}</style>
    </div>
  );
};

export default BonusAI;
