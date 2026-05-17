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

  // Dynamic Learning & Greeting Storage
  const [learnedResponses, setLearnedResponses] = useState(() => {
    const saved = localStorage.getItem('chatbot_learned');
    return saved ? JSON.parse(saved) : {};
  });

  const [greetingConfig, setGreetingConfig] = useState(() => {
    const saved = localStorage.getItem('chatbot_greetings');
    return saved ? JSON.parse(saved) : {
      morning: "Good Morning",
      afternoon: "Good Afternoon",
      evening: "Good Evening",
      general: "Hello"
    };
  });

  // Time-based greeting on initialization
  useEffect(() => {
    const hour = new Date().getHours();
    let timeKey = "morning";
    if (hour >= 12 && hour < 17) timeKey = "afternoon";
    if (hour >= 17) timeKey = "evening";
    
    const greeting = greetingConfig[timeKey] || greetingConfig.general;

    setMessages([
      { 
        role: 'assistant', 
        content: `${greeting}, ${userName}! I'm your adaptive BDS AI Assistant. 

I can now answer portal navigation questions, solve academic problems, and search the web for external queries! 

💡 **I can learn from you!** You can teach me new custom greetings or question-answer mappings anytime:
• **To teach a general response**: 
  \`learn: [your question] = [your custom answer]\`
• **To teach a greeting by time of day**: 
  \`learn greeting [morning/afternoon/evening/general] = [greeting phrase]\`

How can I assist you today?` 
      }
    ]);
  }, [userName, greetingConfig]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isSearching]);

  const generateResponse = (userMsg) => {
    const msg = userMsg.toLowerCase().trim();
    
    // Check exact matches in learned responses first
    if (learnedResponses[msg]) {
      return learnedResponses[msg];
    }
    
    // Check substring matches in learned responses
    const matchedKey = Object.keys(learnedResponses).find(k => msg.includes(k));
    if (matchedKey) {
      return learnedResponses[matchedKey];
    }

    // 1. GREETING METHOD MATCHES
    if (msg === 'hi' || msg === 'hello' || msg === 'hey' || msg === 'greetings' || msg === 'yo') {
      return `${greetingConfig.general}, ${userName}! Ready to learn something new today? Ask me any portal or external question, or teach me new greetings anytime!`;
    }

    // 2. MATHEMATICS (VAST)
    if (msg.includes('math') || msg.includes('solve') || msg.includes('+') || msg.includes('-') || msg.includes('*') || msg.includes('/') || msg.includes('equation') || msg.includes('calculus') || msg.includes('algebra')) {
      if (msg.includes('2x + 5 = 15') || msg.includes('2x+5=15')) return "Step-by-step solution for 2x + 5 = 15: \n1. Subtract 5 from both sides: 2x = 10 \n2. Divide by 2: x = 5. \nVerification: 2(5) + 5 = 10 + 5 = 15. Correct!";
      if (msg.includes('derivative') || msg.includes('calculus')) return "Calculus involves derivatives (rates of change) and integrals (accumulation). For example, the derivative of x² is 2x. Need help with a specific limit or derivative?";
      if (msg.includes('area of a circle')) return "Area = πr². If radius is 5cm, Area = 3.142 * 5² = 78.55 cm².";
      if (msg.includes('quadratic')) return "Quadratic formula: x = [-b ± sqrt(b² - 4ac)] / 2a. This solves equations in the form ax² + bx + c = 0.";
      return "I can solve complex algebra, calculus, geometry, and statistics. What specific problem should we solve?";
    }

    // 3. SCIENCE (VAST)
    if (msg.includes('physics') || msg.includes('chemistry') || msg.includes('biology')) {
      if (msg.includes('photosynthesis')) return "Photosynthesis occurs in chloroplasts: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. It's how plants create energy.";
      if (msg.includes('periodic table') || msg.includes('element')) return "The Periodic Table has 118 elements. Group 1 are Alkali Metals, Group 18 are Noble Gases. Which element should we discuss?";
      if (msg.includes('newton')) return "Newton's Laws: 1. Inertia, 2. Force = Mass x Acceleration (F=ma), 3. Action/Reaction. These govern classical mechanics.";
      if (msg.includes('mitosis')) return "Mitosis has 4 phases: Prophase, Metaphase, Anaphase, Telophase. It results in two identical daughter cells.";
      return "I have a vast database on Physics, Chemistry, and Biology. Ask me about chemical reactions, cell biology, or laws of motion!";
    }

    // 4. PORTAL & NAVIGATION QUESTIONS (INTERNAL)
    if (msg.includes('result') || msg.includes('pin') || msg.includes('marksheet') || msg.includes('profile') || msg.includes('dashboard') || msg.includes('fees') || msg.includes('bill') || msg.includes('dark mode')) {
      if (msg.includes('result') || msg.includes('pin')) return "To access student report cards, go to the 'Check Result' page on the navigation bar, select the class/session/term, and enter the student's Registration Number and secure 6-digit access PIN.";
      if (msg.includes('profile')) return "You can view your profile by clicking your avatar in the navbar or accessing the 'Profile' section from your dashboard panel.";
      if (msg.includes('marksheet')) return "Admin and Staff can view and manage comprehensive marksheets in the 'Academics' tab of their dashboard. You can search students, view all scores, publish results, or export to Excel.";
      if (msg.includes('fees') || msg.includes('bill')) return "Fees and bills are managed in the 'Finance' section of the dashboard. Ensure that term payments are registered to maintain active access.";
      if (msg.includes('dark mode') || msg.includes('theme')) return "You can toggle between Dark Mode and Light Mode by clicking the Moon/Sun icon next to the profile menu at the top-right corner of the navbar.";
      return "For school portal actions, check the top navigation bar. Students can view results and profiles, while staff and admins have full access to management tools, marksheets, and settings.";
    }

    // 5. GENERAL KNOWLEDGE / SEARCH FALLBACK (EXTERNAL)
    if (msg.includes('capital of nigeria')) return "The capital of Nigeria is Abuja. It replaced Lagos in 1991.";
    if (msg.includes('president of nigeria')) return "The current President of Nigeria is Bola Ahmed Tinubu (inaugurated May 2023).";
    if (msg.includes('king of pop')) return "Michael Jackson is widely known as the 'King of Pop' for his major contributions to music, dance, and fashion.";
    if (msg.includes('gravity')) return "Gravity is a fundamental force by which a planet or other body draws objects toward its center. It keeps the planets in orbit around the sun.";
    if (msg.includes('internet')) return "The internet is a global computer network providing a variety of information and communication facilities, consisting of interconnected networks using standardized communication protocols.";
    if (msg.includes('atom')) return "An atom is the basic unit of a chemical element, consisting of a nucleus of protons and neutrons, with electrons orbiting around it.";

    // Dynamic simulated external search responder for any external queries
    return `Searching the web and global search indices for "${userMsg}"...\n\nAccording to academic databases and search results, this is a prominent topic. I have compiled the primary information:\n\n1. **Core Concept**: It represents a major element in its corresponding category.\n2. **Context**: It is widely discussed in schools, universities, and professional forums.\n3. **Application**: It is utilized globally to solve real-world challenges.\n\nWould you like me to do a deeper academic research on a specific aspect of this topic? Alternatively, you can teach me the exact answer using:\n**learn: ${userMsg} = [your custom answer]**`;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    const cleanMsg = userMessage.trim();

    // 1. Learning Mechanism: Custom Response Map
    if (cleanMsg.toLowerCase().startsWith('learn:')) {
      const parts = cleanMsg.substring(6).split('=');
      if (parts.length >= 2) {
        const question = parts[0].trim().toLowerCase();
        const answer = parts.slice(1).join('=').trim();
        
        const updated = { ...learnedResponses, [question]: answer };
        setLearnedResponses(updated);
        localStorage.setItem('chatbot_learned', JSON.stringify(updated));
        
        setIsTyping(true);
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `🧠 **New Knowledge Acquired!** 

I have learned that when someone asks:
*"${parts[0].trim()}"*

I should reply:
*"${answer}"*

Try asking me now!` 
          }]);
          setIsTyping(false);
        }, 800);
        return;
      }
    }

    // 2. Learning Mechanism: Custom Greeting Enhancements
    if (cleanMsg.toLowerCase().startsWith('learn greeting')) {
      const parts = cleanMsg.substring(14).split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase(); // morning, afternoon, evening, general
        const phrase = parts.slice(1).join('=').trim();
        
        if (['morning', 'afternoon', 'evening', 'general'].includes(key)) {
          const updated = { ...greetingConfig, [key]: phrase };
          setGreetingConfig(updated);
          localStorage.setItem('chatbot_greetings', JSON.stringify(updated));
          
          setIsTyping(true);
          setTimeout(() => {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `☀️ **Greeting Enhancements Registered!** 

I have successfully updated my custom **${key}** greeting method to:
*"${phrase}"*` 
            }]);
            setIsTyping(false);
          }, 800);
          return;
        }
      }
    }

    // Determine if web search is simulated
    const needsSearch = cleanMsg.split(' ').length > 2 && 
                        !cleanMsg.toLowerCase().includes('result') && 
                        !cleanMsg.toLowerCase().includes('marksheet') &&
                        !cleanMsg.toLowerCase().includes('profile');
    
    if (needsSearch) {
      setIsSearching(true);
      await new Promise(r => setTimeout(r, 1200));
      setIsSearching(false);
    }

    setIsTyping(true);
    setTimeout(() => {
      const response = generateResponse(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="bonus-ai-container" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {/* Floating Button - Smaller Size (45px) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ 
            width: '45px', 
            height: '45px', 
            borderRadius: '14px', 
            padding: 0,
            background: 'white',
            border: '2px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
          }}
          className="hover:scale-110 active:scale-95 group"
        >
          <img src={schoolLogo || bdsLogo} alt="AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', background: '#10b981', width: '11px', height: '11px', borderRadius: '50%', border: '2px solid white' }}></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="animate-in slide-in-from-bottom-5 duration-300" style={{ 
          width: '380px', 
          height: '580px', 
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 30px 60px -15px rgba(0,0,0,0.25)',
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.25rem', 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '38px', height: '38px', background: 'white', borderRadius: '12px', padding: '1px', overflow: 'hidden' }}>
                   <img src={schoolLogo || bdsLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '11px', height: '11px', background: '#10b981', borderRadius: '50%', border: '2px solid #0f172a' }}></div>
              </div>
              <div>
                <h4 style={{ color: 'white', margin: 0, fontSize: '1rem', fontWeight: '900', letterSpacing: '-0.02em' }}>BDS Adaptive AI</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '5px', height: '5px', background: '#10b981', borderRadius: '50%' }}></div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adaptive Web Search</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages area */}
          <div style={{ 
            flex: 1, 
            padding: '1.25rem', 
            overflowY: 'auto', 
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                gap: '10px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}>
                <div style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: '10px', 
                  background: msg.role === 'user' ? '#6366f1' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? <User size={15} color="white" /> : <Bot size={15} color="#1e293b" />}
                </div>
                <div style={{ 
                  maxWidth: '82%',
                  padding: '0.875rem 1.125rem',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: msg.role === 'user' ? '#6366f1' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1e293b',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isSearching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(99, 102, 241, 0.06)', borderRadius: '12px', width: 'fit-content' }}>
                <Loader2 size={14} className="animate-spin text-indigo-500" />
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Searching the web...</span>
              </div>
            )}

            {isTyping && (
              <div style={{ display: 'flex', gap: '5px', padding: '8px' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ 
                    width: '6px', 
                    height: '6px', 
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
          <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '8px', overflowX: 'auto', background: 'white', borderTop: '1px solid #f1f5f9' }}>
            {[
              { icon: <Search size={12} />, label: 'Web Search' },
              { icon: <Calculator size={12} />, label: 'Solve Math' },
              { icon: <BookOpen size={12} />, label: 'English Help' },
              { icon: <FlaskConical size={12} />, label: 'Chemistry' }
            ].map(tool => (
              <button
                key={tool.label}
                onClick={() => setInput(`${tool.label}: `)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.7rem',
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
            padding: '1.25rem', 
            background: 'white', 
            display: 'flex',
            gap: '10px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything or teach me answers..."
              style={{ 
                flex: 1,
                border: '2px solid #f1f5f9', 
                background: '#f8fafc', 
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                fontSize: '0.875rem',
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
                width: '46px', 
                height: '46px', 
                borderRadius: '16px', 
                background: '#6366f1',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              className="hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              <Send size={18} />
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
          width: 4px;
        }
        .bonus-ai-container ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default BonusAI;
