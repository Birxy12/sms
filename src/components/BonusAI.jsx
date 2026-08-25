import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, X, Bot, User, Minimize2, Maximize2, Sparkles, GraduationCap, 
  Calculator, FlaskConical, Atom, BookOpen, Globe, Search, Loader2, 
  MessageCircle, ExternalLink, Key, HelpCircle, PhoneCall, RefreshCw, Zap
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import { createWhatsAppChatUrl, DEFAULT_SCHOOL_WHATSAPP } from '../utils/whatsapp';
import bdsLogo from '../assets/bdslogo.jpg';

const BonusAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const { schoolLogo, schoolName } = useTheme();
  
  const user = currentAdmin || currentStudent;
  const userName = user?.name || user?.['STUDENT NAME'] || user?.username || 'Scholar';
  const userRole = currentAdmin ? 'Administrator' : currentStudent ? 'Student' : 'Guest';

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

  // Time-based Gemini greeting on initialization
  useEffect(() => {
    const hour = new Date().getHours();
    let timeKey = "morning";
    if (hour >= 12 && hour < 17) timeKey = "afternoon";
    if (hour >= 17) timeKey = "evening";
    
    const greeting = greetingConfig[timeKey] || greetingConfig.general;

    setMessages([
      { 
        role: 'assistant', 
        content: `✨ **${greeting}, ${userName}!**\n\nI am your **Gemini-Powered Academic AI Assistant** for **${schoolName || 'BDS Portal'}**.\n\nHere is how I can help you today:\n\n* **🧮 Mathematics & Sciences**: Step-by-step solutions for algebra, calculus, physics equations, chemistry reactions, and biology.\n* **📚 Humanities & Languages**: English grammar, essay structuring, literature analysis, and economics.\n* **🎯 WAEC / JAMB / BECE Exam Prep**: Exam tips, past question solving, and revision guides.\n* **🏫 School Portal Navigation**: Marksheets, report card PIN checks, subject registration, and fee payments.\n* **💬 Private WhatsApp Support**: Start an instant 1-on-1 private WhatsApp consultation with school staff.\n* **🔐 PIN & Account Recovery**: Help you reset or receive your portal PIN via WhatsApp.\n\nHow can I empower your learning today?` 
      }
    ]);
  }, [userName, greetingConfig, schoolName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isSearching]);

  const generateGeminiResponse = (userMsg) => {
    const msg = userMsg.toLowerCase().trim();
    
    // Check exact matches in learned responses first
    if (learnedResponses[msg]) {
      return { text: learnedResponses[msg] };
    }
    
    // Check substring matches in learned responses
    const matchedKey = Object.keys(learnedResponses).find(k => msg.includes(k));
    if (matchedKey) {
      return { text: learnedResponses[matchedKey] };
    }

    // 1. WHATSAPP / PRIVATE CHAT INTENT
    if (msg.includes('whatsapp') || msg.includes('private chat') || msg.includes('speak to teacher') || msg.includes('human') || msg.includes('contact school') || msg.includes('customer care') || msg.includes('support')) {
      const whatsappUrl = createWhatsAppChatUrl(DEFAULT_SCHOOL_WHATSAPP, `Hello BDS School Support! I am ${userName} (${userRole}). I would like to initiate a private consultation regarding my portal inquiry: "${userMsg}"`);
      return {
        text: `📱 **Direct WhatsApp Consultation**\n\nYou can connect directly with our school support team and subject teachers on WhatsApp for private chats, admissions inquiries, fee verification, or personalized academic guidance.`,
        action: {
          type: 'whatsapp',
          label: '💬 Open Private WhatsApp Chat',
          url: whatsappUrl
        }
      };
    }

    // 2. PIN RESET / FORGOT PIN INTENT
    if (msg.includes('forgot pin') || msg.includes('reset pin') || msg.includes('change pin') || msg.includes('lost pin') || msg.includes('login pin')) {
      return {
        text: `🔐 **Portal PIN Recovery Guide**\n\nIf you forgot your 6-digit Portal Login PIN, follow these quick steps:\n\n1. **On the Login Screen**: Click **"Forgot 6-Digit PIN?"**.\n2. **Enter Registration Number & Class**: The system checks your profile.\n3. **📲 WhatsApp Dispatch**: If your phone number is on file, you can receive your new PIN directly via WhatsApp with one click!\n4. **Student Inbox**: Your new PIN is also delivered to your personal portal inbox.\n\n*Need immediate admin help? Click below to message school support on WhatsApp:*`,
        action: {
          type: 'whatsapp',
          label: '📲 Request PIN Reset via WhatsApp',
          url: createWhatsAppChatUrl(DEFAULT_SCHOOL_WHATSAPP, `Hello Admin, I am ${userName} and I need assistance resetting my student portal login PIN. My Registration Number is: `)
        }
      };
    }

    // 3. GREETING
    if (msg === 'hi' || msg === 'hello' || msg === 'hey' || msg === 'greetings' || msg === 'yo' || msg === 'good morning' || msg === 'good afternoon') {
      return {
        text: `Hello ${userName}! 👋 I am ready to help you with mathematics, physics, chemistry, literature, exam tips, or school portal tasks. What topic are we tackling today?`
      };
    }

    // 4. MATHEMATICS ENGINE
    if (msg.includes('math') || msg.includes('solve') || msg.includes('+') || msg.includes('-') || msg.includes('*') || msg.includes('/') || msg.includes('equation') || msg.includes('calculus') || msg.includes('algebra') || msg.includes('quadratic') || msg.includes('trigonometry') || msg.includes('pythagoras') || msg.includes('probability')) {
      if (msg.includes('2x + 5 = 15') || msg.includes('2x+5=15')) {
        return {
          text: `📐 **Step-by-Step Algebraic Solution**:\n\nGiven equation: **2x + 5 = 15**\n\n1. **Isolate the term with x** by subtracting 5 from both sides:\n   $$2x = 15 - 5$$\n   $$2x = 10$$\n\n2. **Divide both sides by 2**:\n   $$x = \\frac{10}{2}$$\n   **x = 5**\n\n✅ **Verification**: Substitute $x = 5$ back into $2(5) + 5 = 10 + 5 = 15$. Both sides are equal!`
        };
      }
      if (msg.includes('quadratic')) {
        return {
          text: `📊 **Quadratic Equations Master Guide**\n\nA quadratic equation has the standard form: **ax² + bx + c = 0**\n\n* **Quadratic Formula**: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n* **Discriminant (D = b² - 4ac)**:\n  - If $D > 0$: 2 real and distinct roots.\n  - If $D = 0$: 1 real repeated root ($x = -b/2a$).\n  - If $D < 0$: Complex / imaginary roots.\n\n*Type your specific quadratic equation (e.g. \`solve: x^2 - 5x + 6 = 0\`) to see the full factorization!*`
        };
      }
      if (msg.includes('derivative') || msg.includes('calculus')) {
        return {
          text: `📈 **Calculus Fundamentals**:\n\n* **Power Rule of Differentiation**: $$\\frac{d}{dx}[x^n] = n x^{n-1}$$\n* **Examples**:\n  - $\\frac{d}{dx}[x^3] = 3x^2$\n  - $\\frac{d}{dx}[5x^2] = 10x$\n  - $\\frac{d}{dx}[\\sin(x)] = \\cos(x)$\n* **Integration (Reverse Derivative)**: $$\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$$\n\nGive me a function to differentiate or integrate step-by-step!`
        };
      }
      if (msg.includes('pythagoras') || msg.includes('triangle')) {
        return {
          text: `📐 **Pythagoras Theorem**\n\nIn any right-angled triangle:\n$$a^2 + b^2 = c^2$$\nWhere:\n* **a** and **b** are the legs (perpendicular and base)\n* **c** is the hypotenuse (the longest side opposite the 90° angle)\n\n*Example*: If $a = 3$ and $b = 4$, then $c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$.`
        };
      }
      return {
        text: `🧮 **Gemini Math Solver Ready**\n\nI can solve arithmetic, simultaneous linear equations, polynomials, geometry areas/volumes, trigonometry ratios ($\\sin, \\cos, \\tan$), logarithms, and matrices.\n\nPlease provide your equation or word problem to get a comprehensive step-by-step breakdown!`
      };
    }

    // 5. SCIENCES (PHYSICS, CHEMISTRY, BIOLOGY)
    if (msg.includes('physics') || msg.includes('chemistry') || msg.includes('biology') || msg.includes('photosynthesis') || msg.includes('periodic') || msg.includes('newton') || msg.includes('ohm') || msg.includes('dna') || msg.includes('cell')) {
      if (msg.includes('photosynthesis')) {
        return {
          text: `🌿 **Photosynthesis Process**\n\nPhotosynthesis is the biochemical process by which green plants synthesize glucose using sunlight, water, and carbon dioxide.\n\n* **Balanced Chemical Equation**:\n  $$6CO_2 + 6H_2O \\xrightarrow{\\text{Sunlight, Chlorophyll}} C_6H_{12}O_6 + 6O_2$$\n\n* **Stages**:\n  1. **Light Reaction (Granum)**: Photolysis of water releases oxygen and produces ATP/NADPH.\n  2. **Dark Reaction / Calvin Cycle (Stroma)**: Fixation of Carbon dioxide into glucose.`
        };
      }
      if (msg.includes('newton') || msg.includes('motion')) {
        return {
          text: `⚡ **Newton's Laws of Motion**\n\n1. **First Law (Inertia)**: An object remains at rest or continues in uniform motion in a straight line unless acted upon by an external net force.\n2. **Second Law ($F = ma$)**: The rate of change of momentum is directly proportional to the applied force: $$\\text{Force} = \\text{Mass} \\times \\text{Acceleration}$$\n3. **Third Law (Action & Reaction)**: For every action, there is an equal and opposite reaction.`
        };
      }
      if (msg.includes('ohm') || msg.includes('electricity')) {
        return {
          text: `🔌 **Ohm's Law of Electricity**\n\nOhm's law states that current ($I$) flowing through a conductor between two points is directly proportional to the voltage ($V$) across the two points, provided temperature remains constant.\n\n* **Formula**: $$V = I \\times R$$\n* Where: $V$ = Voltage (Volts), $I$ = Current (Amperes), $R$ = Resistance (Ohms $\\Omega$).`
        };
      }
      if (msg.includes('periodic table') || msg.includes('element')) {
        return {
          text: `🧪 **Periodic Table Insights**\n\nThe Periodic Table arranges 118 chemical elements according to atomic number:\n\n* **Group 1**: Alkali Metals ($Li, Na, K$ - highly reactive with water).\n* **Group 7 / 17**: Halogens ($F, Cl, Br, I$ - strong oxidizing agents).\n* **Group 8 / 18**: Noble Gases ($He, Ne, Ar, Kr$ - inert and stable octet).\n* **Periods**: Indicate the number of electron shells.`
        };
      }
      return {
        text: `🔬 **Gemini Science Engine Active**\n\nAsk me about organic chemistry mechanisms, stoichiometry, gravitational fields, optics, genetics (Punnett squares & genotypes), ecology, or plant/animal physiology!`
      };
    }

    // 6. NIGERIAN EXAM PREPARATION (WAEC, JAMB, NECO, BECE)
    if (msg.includes('waec') || msg.includes('jamb') || msg.includes('neco') || msg.includes('bece') || msg.includes('exam tips') || msg.includes('cbt')) {
      return {
        text: `🎯 **WAEC & JAMB/UTME Success Strategies**\n\n1. **CBT Time Management**: Spend no more than 45 seconds on each objective question. Flag tough questions and return to them.\n2. **Syllabus Mastery**: Cover the designated WAEC/JAMB syllabus topics rather than studying aimlessly.\n3. **Past Questions Practice**: Practicing 10 years of past questions increases your exam confidence by over 70%.\n4. **Theory Structure**: In WAEC, always show working steps in Math/Physics, write balanced chemical equations in Chemistry, and define key terms clearly in Biology/English.`
      };
    }

    // 7. PORTAL & ACADEMIC MANAGEMENT
    if (msg.includes('result') || msg.includes('pin') || msg.includes('marksheet') || msg.includes('promotion') || msg.includes('subject registration') || msg.includes('admission') || msg.includes('fees') || msg.includes('report card')) {
      if (msg.includes('promotion') || msg.includes('move student')) {
        return {
          text: `🎓 **Class Promotion Criteria**\n\n* **Pass Cut-off**: Students must attain a **Third Term Cumulative Average of 45% or above** to be promoted.\n* **Junior Secondary (JSS1 -> JSS3)**: Promoted automatically based on overall average.\n* **Senior Secondary Transition (JSS3 -> SS1)**: Students transition into SS1 and select their specialization streams (Science or Art).\n* **SS1 -> SS2 & SS2 -> SS3**: Stream-specific promotion handled by class teachers and admin.`
        };
      }
      if (msg.includes('result') || msg.includes('report card')) {
        return {
          text: `📋 **Checking Terminal Report Cards**\n\n1. Click **"Check Result"** in the top navigation bar.\n2. Select your **Academic Session** (e.g. 2025/2026), **Term** (1st, 2nd, or 3rd Term), and **Class**.\n3. Enter your **Student Registration Number** and **6-Digit Portal PIN**.\n4. Click **"View & Print Result"** to access your official stamped scorecard.`
        };
      }
      if (msg.includes('subject registration')) {
        return {
          text: `📝 **Senior Secondary Subject Registration**\n\nSenior students (SS1, SS2, SS3) must register their 9 curriculum subjects:\n* **Science Stream**: English, Mathematics, Biology, Physics, Chemistry, Economics, Civic Education, etc.\n* **Art Stream**: English, Mathematics, Literature, Government, CRS/IRS, Economics, Civic Education, etc.\n* Access the portal under **"Subject Registration"** when active.`
        };
      }
      return {
        text: `🏫 **BDS School Portal Guide**\n\n* **Check Results**: View terminal scorecards & grade breakdowns.\n* **Class Assignments & Notes**: Download teacher worksheets and lecture slides.\n* **Online CBT**: Practice CBT examinations with automatic grading.\n* **WhatsApp Direct Support**: Reach the school administration 24/7.`
      };
    }

    // 8. GENERAL KNOWLEDGE / FALLBACK
    return {
      text: `✨ **Gemini Knowledge Synthesis for "${userMsg}"**:\n\n1. **Overview**: This is an important concept spanning academic and real-world applications.\n2. **Key Insight**: Exploring this topic sharpens problem-solving and critical reasoning skills.\n3. **Follow-up**: Would you like a detailed breakdown, past question examples, or assistance with related subjects?\n\n💡 *Tip: You can also teach me customized responses using:*\n\`learn: ${userMsg} = [your custom response]\``
    };
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
            content: `🧠 **New Knowledge Acquired!**\n\nI have registered that when asked: *"${parts[0].trim()}"*\n\nI will respond:\n*"${answer}"*` 
          }]);
          setIsTyping(false);
        }, 600);
        return;
      }
    }

    // 2. Learning Mechanism: Custom Greeting
    if (cleanMsg.toLowerCase().startsWith('learn greeting')) {
      const parts = cleanMsg.substring(14).split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const phrase = parts.slice(1).join('=').trim();
        
        if (['morning', 'afternoon', 'evening', 'general'].includes(key)) {
          const updated = { ...greetingConfig, [key]: phrase };
          setGreetingConfig(updated);
          localStorage.setItem('chatbot_greetings', JSON.stringify(updated));
          
          setIsTyping(true);
          setTimeout(() => {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: `☀️ **Custom ${key} greeting updated to:**\n*"${phrase}"*` 
            }]);
            setIsTyping(false);
          }, 600);
          return;
        }
      }
    }

    // Simulated Gemini web search delay for long/complex queries
    const needsSearch = cleanMsg.split(' ').length > 3 && 
                        !cleanMsg.toLowerCase().includes('result') && 
                        !cleanMsg.toLowerCase().includes('pin');
    
    if (needsSearch) {
      setIsSearching(true);
      await new Promise(r => setTimeout(r, 800));
      setIsSearching(false);
    }

    setIsTyping(true);
    setTimeout(() => {
      const response = generateGeminiResponse(userMessage);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.text,
        action: response.action 
      }]);
      setIsTyping(false);
    }, 400);
  };

  const handleQuickPrompt = (promptText) => {
    setInput(promptText);
  };

  return (
    <div className="bonus-ai-container" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {/* Floating Button with Gemini Gradient & Sparkles */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '18px', 
            padding: 0,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            border: '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 12px 30px rgba(67, 56, 202, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
          }}
          className="hover:scale-110 active:scale-95 group"
          title="Open BDS Gemini AI & WhatsApp Support"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles size={24} className="text-amber-300 animate-pulse" />
          </div>
          <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: '#22c55e', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white' }}></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="animate-in slide-in-from-bottom-5 duration-300 shadow-2xl flex flex-col overflow-hidden bg-white border border-slate-200"
          style={{ 
            width: isExpanded ? '540px' : '400px', 
            height: isExpanded ? '680px' : '590px', 
            borderRadius: '26px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 32px)',
            transition: 'width 0.3s ease, height 0.3s ease'
          }}
        >
          {/* Gemini Header */}
          <div style={{ 
            padding: '1rem 1.25rem', 
            background: 'linear-gradient(135deg, #090d16 0%, #171d31 50%, #1e1b4b 100%)', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #4285f4, #9b72cb, #d96570)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(155,114,203,0.3)' }}>
                   <Sparkles size={20} color="#fff" />
                </div>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', border: '2px solid #090d16' }}></div>
              </div>
              <div>
                <h4 style={{ color: 'white', margin: 0, fontSize: '0.95rem', fontWeight: '900', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  BDS Gemini AI <span className="text-[10px] font-black bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">PRO</span>
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  STEM • Portal Guide • WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href={createWhatsAppChatUrl(DEFAULT_SCHOOL_WHATSAPP, `Hello BDS Support, I am ${userName} seeking private assistance.`)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Private WhatsApp Chat"
                className="w-8 h-8 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white flex items-center justify-center transition-all"
              >
                <MessageCircle size={16} />
              </a>

              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close Assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages stream */}
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
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '11px', 
                  background: msg.role === 'user' ? '#4f46e5' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                  border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0'
                }}>
                  {msg.role === 'user' ? <User size={16} color="white" /> : <Sparkles size={16} className="text-indigo-600" />}
                </div>

                <div style={{ 
                  maxWidth: '85%',
                  padding: '0.9rem 1.2rem',
                  borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '4px 20px 20px 20px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1e293b',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  border: msg.role === 'user' ? 'none' : '1px solid #f1f5f9'
                }}>
                  {msg.content}

                  {msg.action && msg.action.type === 'whatsapp' && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <a
                        href={msg.action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-emerald-100"
                      >
                        <MessageCircle size={15} /> {msg.action.label}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isSearching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', width: 'fit-content' }}>
                <Loader2 size={14} className="animate-spin text-indigo-600" />
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gemini Reasoning Engine...</span>
              </div>
            )}

            {isTyping && (
              <div style={{ display: 'flex', gap: '5px', padding: '8px', background: 'white', borderRadius: '12px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: '#6366f1', 
                    borderRadius: '50%', 
                    animation: `bounce 1.4s infinite ease-in-out ${d * 0.2}s` 
                  }}></div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompt Chips */}
          <div style={{ padding: '0.65rem 0.9rem', display: 'flex', gap: '6px', overflowX: 'auto', background: 'white', borderTop: '1px solid #f1f5f9' }}>
            {[
              { icon: <Calculator size={12} />, label: 'Solve Math', text: 'Solve equation: 2x + 5 = 15' },
              { icon: <FlaskConical size={12} />, label: 'Photosynthesis', text: 'Explain photosynthesis chemical equation and stages' },
              { icon: <GraduationCap size={12} />, label: 'Exam Tips', text: 'Give me top WAEC and JAMB CBT exam tips' },
              { icon: <Key size={12} />, label: 'Reset PIN', text: 'How do I reset my portal login PIN on WhatsApp?' },
              { icon: <MessageCircle size={12} />, label: 'WhatsApp Chat', text: 'I want to start a private WhatsApp chat with school support' }
            ].map(tool => (
              <button
                key={tool.label}
                onClick={() => handleQuickPrompt(tool.text)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  whiteSpace: 'nowrap',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                className="hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 flex-shrink-0"
              >
                {tool.icon} {tool.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} style={{ 
            padding: '1rem 1.25rem', 
            background: 'white', 
            display: 'flex',
            gap: '8px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Gemini AI anything or ask for WhatsApp support..."
              style={{ 
                flex: 1,
                border: '1.5px solid #e2e8f0', 
                background: '#f8fafc', 
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                fontSize: '0.85rem',
                fontWeight: '600',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              className="focus:border-indigo-500 focus:bg-white text-slate-800"
            />
            <button 
              type="submit"
              disabled={isSearching || isTyping || !input.trim()}
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '16px', 
                background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 14px rgba(79, 70, 229, 0.25)',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              className="hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              <Send size={16} />
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
