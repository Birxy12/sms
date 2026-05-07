import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Minimize2, Sparkles } from 'lucide-react';
import { CLASS_LIST, getSubjectsForClass, getAllSubjects } from '../utils/subjectConfig';

const BonusAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm Bonus AI, your BDS Portal assistant. I've been updated with full knowledge of our school's curriculum and features. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const SCHOOL_KNOWLEDGE = {
    subjects: {
      all: getAllSubjects(),
      byClass: CLASS_LIST.reduce((acc, cls) => {
        acc[cls] = getSubjectsForClass(cls);
        return acc;
      }, {})
    },
    features: {
      results: "You can view academic results in the 'Student Results' section. Admins publish these from the Marksheet management area.",
      cbt: "Computer Based Testing (CBT) is available for online examinations. Students can access it from their dashboard, and teachers can manage questions in the CBT Management area.",
      fees: "The 'Student Fees' module allows you to track payments and generate receipts.",
      idcard: "Students can generate and download their digital ID cards from the 'ID Card' section of their profile.",
      assignments: "Teachers post assignments which students can download and submit through the 'Assignments' tab.",
      notes: "E-notes and study materials are available in the 'Student Notes' section."
    },
    general: {
      name: "Bonus Dominus Secondary School (BDS)",
      motto: "Excellence in Learning and Character",
      location: "Main Campus, BDS Portal Digital Infrastructure",
      education: "We provide high-quality secondary education focusing on both Arts and Sciences, with a strong emphasis on character development and technical proficiency."
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMsg) => {
    const msg = userMsg.toLowerCase();
    
    // 1. Check for specific classes and subjects
    for (const cls of CLASS_LIST) {
      if (msg.includes(cls.toLowerCase())) {
        const subjects = SCHOOL_KNOWLEDGE.subjects.byClass[cls];
        return `For ${cls}, we offer the following subjects: ${subjects.join(', ')}. Is there a specific subject you'd like to know more about?`;
      }
    }

    // 2. Check for general subject inquiries
    if (msg.includes('subject') || msg.includes('course') || msg.includes('offer')) {
      return `We offer a wide range of subjects across Junior and Senior levels. For JSS students, we have core subjects like Mathematics, English, and Basic Science. Senior students can specialize in Art or Science streams. Which class level are you interested in?`;
    }

    // 3. Check for specific features
    if (msg.includes('result')) return SCHOOL_KNOWLEDGE.features.results;
    if (msg.includes('cbt') || msg.includes('exam') || msg.includes('test')) return SCHOOL_KNOWLEDGE.features.cbt;
    if (msg.includes('fee') || msg.includes('pay') || msg.includes('receipt')) return SCHOOL_KNOWLEDGE.features.fees;
    if (msg.includes('id card') || msg.includes('identity')) return SCHOOL_KNOWLEDGE.features.idcard;
    if (msg.includes('assignment')) return SCHOOL_KNOWLEDGE.features.assignments;
    if (msg.includes('note') || msg.includes('study')) return SCHOOL_KNOWLEDGE.features.notes;

    // 4. General school info
    if (msg.includes('who are you') || msg.includes('what is bds')) return `I am Bonus AI, the digital assistant for ${SCHOOL_KNOWLEDGE.general.name}. ${SCHOOL_KNOWLEDGE.general.education}`;
    if (msg.includes('motto')) return `Our school motto is: "${SCHOOL_KNOWLEDGE.general.motto}".`;
    if (msg.includes('location') || msg.includes('where')) return `We are located at ${SCHOOL_KNOWLEDGE.general.location}.`;

    // 5. Educational/Broad questions (Fallback)
    if (msg.includes('education') || msg.includes('learn')) {
      return "Education at BDS is designed to be holistic. We cover Science, Arts, and Technical subjects to ensure our students are well-prepared for higher education and future careers.";
    }

    // 6. Default
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return "Hello! I'm Bonus AI. I can tell you about our subjects, help you navigate the portal, or explain how to use features like CBT and Results. What's on your mind?";
    }

    return "I'm not quite sure about that specific query, but I can definitely help with subjects, results, fees, or any other school portal feature. Try asking about a specific class like 'JSS1 subjects'!";
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 800);
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

          {/* Quick Suggestions */}
          {!isTyping && messages.length < 4 && (
            <div style={{ 
              padding: '0.5rem 1.25rem', 
              display: 'flex', 
              gap: '8px', 
              overflowX: 'auto', 
              background: 'white',
              scrollbarWidth: 'none'
            }}>
              {['JSS1 Subjects', 'How to check results?', 'What is CBT?'].map(txt => (
                <button
                  key={txt}
                  onClick={() => {
                    setInput(txt);
                    // Trigger handleSend manually or just set input and let user click send
                    // For better UX, we'll just set it and focus the input
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: '1px solid var(--primary)',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {txt}
                </button>
              ))}
            </div>
          )}

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
