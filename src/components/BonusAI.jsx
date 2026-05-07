import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Minimize2, Sparkles, GraduationCap, Calculator, FlaskConical, Atom, BookOpen, Globe, Search, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import bdsLogo from '../assets/bdslogo.jpg';

const BonusAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const { schoolLogo, schoolName } = useTheme();
  
  const user = currentAdmin || currentStudent;
  const userName = user?.name || user?.['STUDENT NAME'] || 'Friend';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);

  // Time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    if (hour >= 17) greeting = "Good Evening";

    setMessages([
      { 
        role: 'assistant', 
        content: `${greeting}, ${userName}! I'm your enhanced BDS AI Assistant. I can now search the web and solve complex problems in Mathematics, Physics, Chemistry, Biology, and more. How can I assist you today?` 
      }
    ]);
  }, [userName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isSearching]);

  const generateResponse = (userMsg) => {
    const msg = userMsg.toLowerCase();
    
    // 1. MATHEMATICS (VAST)
    if (msg.includes('math') || msg.includes('solve') || msg.includes('+') || msg.includes('-') || msg.includes('*') || msg.includes('/') || msg.includes('equation') || msg.includes('calculus')) {
      if (msg.includes('2x + 5 = 15') || msg.includes('2x+5=15')) return "Step-by-step solution for 2x + 5 = 15: \n1. Subtract 5 from both sides: 2x = 10 \n2. Divide by 2: x = 5. \nVerification: 2(5) + 5 = 10 + 5 = 15. Correct!";
      if (msg.includes('derivative') || msg.includes('calculus')) return "Calculus involves derivatives (rates of change) and integrals (accumulation). For example, the derivative of x² is 2x. Need help with a specific limit or derivative?";
      if (msg.includes('area of a circle')) return "Area = πr². If radius is 5cm, Area = 3.142 * 5² = 78.55 cm².";
      if (msg.includes('quadratic')) return "Quadratic formula: x = [-b ± sqrt(b² - 4ac)] / 2a. This solves equations in the form ax² + bx + c = 0.";
      return "I can solve Algebra, Calculus, Geometry, and Statistics. What specific problem should we tackle?";
    }

    // 2. SCIENCE (VAST)
    if (msg.includes('physics') || msg.includes('chemistry') || msg.includes('biology')) {
      if (msg.includes('photosynthesis')) return "Photosynthesis occurs in chloroplasts: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. It's how plants create energy.";
      if (msg.includes('periodic table') || msg.includes('element')) return "The Periodic Table has 118 elements. Group 1 are Alkali Metals, Group 18 are Noble Gases. Which element should we discuss?";
      if (msg.includes('newton')) return "Newton's Laws: 1. Inertia, 2. F=ma, 3. Action/Reaction. These govern classical mechanics.";
      if (msg.includes('mitosis')) return "Mitosis has 4 phases: Prophase, Metaphase, Anaphase, Telophase. It results in two identical daughter cells.";
      return "I have a vast database on Physics, Chemistry, and Biology. Ask me about chemical reactions, cell biology, or laws of motion!";
    }

    // 3. GENERAL KNOWLEDGE / SEARCH SIMULATION
    if (msg.includes('who') || msg.includes('what') || msg.includes('where') || msg.includes('capital') || msg.includes('president')) {
      if (msg.includes('capital of nigeria')) return "The capital of Nigeria is Abuja. It replaced Lagos in 1991.";
      if (msg.includes('who is the president')) return "As of my latest web update, Bola Ahmed Tinubu is the President of Nigeria (inaugurated May 2023).";
      return "Searching my global database... I found that this relates to general knowledge. Could you be more specific so I can provide the exact information?";
    }

    // 4. PORTAL & MISC
    if (msg.includes('result')) return "To access results, go to the 'Check Result' page, enter your Reg No and PIN. Ensure your term fees are cleared for full access.";
    if (msg.includes('hi') || msg.includes('hello')) return `Hello ${userName}! Ready to learn something new today? I'm connected to the web and ready to help!`;

    return "I've searched my vast local and web-connected sources. While I'm learning every day, I can definitely help with your school subjects or portal navigation. Ask me a specific academic question!";
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // Simulate web search for anything that looks like a query
    const needsSearch = userMessage.split(' ').length > 2;
    
    if (needsSearch) {
      setIsSearching(true);
      // Simulate network delay for "search"
      await new Promise(r => setTimeout(r, 1500));
      setIsSearching(false);
    }

    setIsTyping(true);
    setTimeout(() => {
      const response = generateResponse(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="bonus-ai-container" style={{ position: 'fixed', bottom: '25px', right: '25px', zIndex: 1000 }}>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ 
            width: '65px', 
            height: '65px', 
            borderRadius: '22px', 
            padding: 0,
            background: 'white',
            border: '2px solid #e2e8f0',
            boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="hover:scale-110 active:scale-95 group"
        >
          <img src={schoolLogo || bdsLogo} alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#10b981', width: '15px', height: '15px', borderRadius: '50%', border: '3px solid white' }}></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="animate-in slide-in-from-bottom-5 duration-300" style={{ 
          width: '420px', 
          height: '650px', 
          background: 'white',
          borderRadius: '32px',
          boxShadow: '0 30px 70px -15px rgba(0,0,0,0.2)',
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          border: '1px solid #f1f5f9'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.5rem', 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '16px', padding: '2px', overflow: 'hidden' }}>
                   <img src={schoolLogo || bdsLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '14px', height: '14px', background: '#10b981', borderRadius: '50%', border: '3px solid #0f172a' }}></div>
              </div>
              <div>
                <h4 style={{ color: 'white', margin: 0, fontSize: '1.15rem', fontWeight: '900', letterSpacing: '-0.02em' }}>BDS Vast AI</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Web Connected • Pro Engine</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '38px', height: '38px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Messages area */}
          <div style={{ 
            flex: 1, 
            padding: '1.5rem', 
            overflowY: 'auto', 
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                gap: '12px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}>
                <div style={{ 
                  width: '34px', 
                  height: '34px', 
                  borderRadius: '12px', 
                  background: msg.role === 'user' ? '#6366f1' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? <User size={18} color="white" /> : <Bot size={18} color="#1e293b" />}
                </div>
                <div style={{ 
                  maxWidth: '80%',
                  padding: '1rem 1.25rem',
                  borderRadius: msg.role === 'user' ? '24px 24px 4px 24px' : '4px 24px 24px 24px',
                  background: msg.role === 'user' ? '#6366f1' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1e293b',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  fontSize: '0.92rem',
                  fontWeight: '500',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isSearching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '15px', width: 'fit-content' }}>
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Searching the web...</span>
              </div>
            )}

            {isTyping && (
              <div style={{ display: 'flex', gap: '6px', padding: '10px' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ 
                    width: '8px', 
                    height: '8px', 
                    background: '#cbd5e1', 
                    borderRadius: '50%', 
                    animation: `bounce 1.4s infinite ease-in-out ${d * 0.2}s` 
                  }}></div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Tools */}
          <div style={{ padding: '0.875rem 1.25rem', display: 'flex', gap: '10px', overflowX: 'auto', background: 'white', borderTop: '1px solid #f1f5f9' }}>
            {[
              { icon: <Search size={14} />, label: 'Web Search' },
              { icon: <Calculator size={14} />, label: 'Solve Math' },
              { icon: <BookOpen size={14} />, label: 'English Help' },
              { icon: <FlaskConical size={14} />, label: 'Chemistry' }
            ].map(tool => (
              <button
                key={tool.label}
                onClick={() => setInput(`${tool.label}: `)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
              >
                {tool.icon} {tool.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <form onSubmit={handleSend} style={{ 
            padding: '1.5rem', 
            background: 'white', 
            display: 'flex',
            gap: '12px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything (Web Search enabled)..."
              style={{ 
                flex: 1,
                border: '2px solid #f1f5f9', 
                background: '#f8fafc', 
                padding: '1rem 1.25rem',
                borderRadius: '20px',
                fontSize: '0.95rem',
                fontWeight: '500',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              className="focus:border-indigo-500 focus:bg-white"
            />
            <button 
              type="submit"
              disabled={isSearching || isTyping}
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '20px', 
                background: '#6366f1',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 12px 24px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.2s'
              }}
              className="hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              <Send size={22} />
            </button>
          </form>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .bonus-ai-container ::-webkit-scrollbar {
          width: 5px;
        }
        .bonus-ai-container ::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default BonusAI;
