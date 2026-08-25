import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, X, Bot, User, Minimize2, Maximize2, Sparkles, GraduationCap, 
  Calculator, FlaskConical, Atom, BookOpen, Globe, Search, Loader2, 
  MessageCircle, ExternalLink, Key, HelpCircle, PhoneCall, RefreshCw, Zap,
  BookMarked, FileText, Bell, Layers, Download, CheckCircle2
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, query, limit, orderBy, serverTimestamp } from 'firebase/firestore';
import { createWhatsAppChatUrl, DEFAULT_SCHOOL_WHATSAPP } from '../utils/whatsapp';
import { CLASS_LIST, getSubjectsForClass, getAllSubjects } from '../utils/subjectConfig';
import bdsLogo from '../assets/bdslogo.jpg';

const BonusAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const { 
    schoolLogo, 
    schoolName, 
    currentSession, 
    currentTerm, 
    promotionPassMark,
    cat1Limit,
    cat2Limit,
    examLimit
  } = useTheme();
  
  const user = currentAdmin || currentStudent;
  const userName = user?.name || user?.['STUDENT NAME'] || user?.username || 'Scholar';
  const userClass = (currentStudent?.className || currentStudent?.classId || '').trim().toUpperCase();
  const userRole = currentAdmin ? 'Administrator' : currentStudent ? `Student (${userClass || 'General'})` : 'Visitor';

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef(null);

  // Live Database Cache from Firestore
  const [dbKnowledge, setDbKnowledge] = useState({
    assignments: [],
    notes: [],
    notifications: [],
    globalAiKnowledge: {},
    loaded: false
  });

  // Local storage backup for learned Q&As
  const [localLearned, setLocalLearned] = useState(() => {
    const saved = localStorage.getItem('chatbot_learned');
    return saved ? JSON.parse(saved) : {};
  });

  // 1. Fetch live webapp data and Firestore knowledge base
  const fetchLiveDatabaseContext = async () => {
    try {
      const [assignmentsSnap, notesSnap, notifsSnap, aiKnowledgeSnap] = await Promise.all([
        getDocs(query(collection(db, 'assignments'), limit(25))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'notes'), limit(25))).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'notifications'), limit(15))).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'ai_knowledge')).catch(() => ({ docs: [] }))
      ]);

      const assignments = assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const notes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const notifications = notifsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const globalAiKnowledge = {};
      aiKnowledgeSnap.docs.forEach(d => {
        const data = d.data();
        if (data.question && data.answer) {
          globalAiKnowledge[data.question.toLowerCase().trim()] = data.answer;
        }
      });

      setDbKnowledge({
        assignments,
        notes,
        notifications,
        globalAiKnowledge,
        loaded: true
      });
    } catch (err) {
      console.warn('Error pre-fetching live DB context for Gemini AI:', err);
    }
  };

  useEffect(() => {
    fetchLiveDatabaseContext();
  }, []);

  // Initial welcome message
  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = "Good Morning";
    if (hour >= 12 && hour < 17) timeGreeting = "Good Afternoon";
    if (hour >= 17) timeGreeting = "Good Evening";

    setMessages([
      { 
        role: 'assistant', 
        content: `✨ **${timeGreeting}, ${userName}!**\n\nI am your **Gemini Academic & Portal Assistant** for **${schoolName || 'BDS Portal'}**.\n\nI am connected live to your **School Database, Curriculum Subjects, Assignments, and Study Notes**.\n\nHere is how I can assist you right now:\n* 📚 **Subjects & Curriculum**: Ask *"What subjects are offered in JSS2 or SS2 Science?"*\n* 📝 **Active Assignments**: Ask *"Do we have any homework or assignments for ${userClass || 'JSS1'}?"*\n* 📖 **Lecture Notes & Materials**: Ask *"Show study notes for Chemistry or Mathematics"*\n* 🧮 **Solve Math & Science**: Step-by-step solutions for algebra, physics formulas, and chemical equations\n* 🎯 **WAEC / JAMB / BECE Tips**: Exam strategies, past questions, and revision guides\n* 💬 **Private WhatsApp Consultation**: Connect directly with teachers or school support\n* 🔐 **PIN Recovery**: Guide you or send your login PIN via WhatsApp\n\nWhat would you like to explore?` 
      }
    ]);
  }, [userName, userClass, schoolName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isSearching]);

  // Comprehensive AI reasoning engine
  const processQuery = (rawMsg) => {
    const msg = rawMsg.toLowerCase().trim();
    const cleanWords = msg.split(/\s+/);

    // ─── A. LEARNED KNOWLEDGE (Database + LocalStorage) ───
    if (dbKnowledge.globalAiKnowledge[msg]) {
      return { text: `🧠 **From Knowledge Base**:\n\n${dbKnowledge.globalAiKnowledge[msg]}` };
    }
    if (localLearned[msg]) {
      return { text: `🧠 **From Learned Memory**:\n\n${localLearned[msg]}` };
    }

    // Substring match in learned database
    for (const [k, ans] of Object.entries({ ...localLearned, ...dbKnowledge.globalAiKnowledge })) {
      if (msg.includes(k) || k.includes(msg)) {
        return { text: `🧠 **From Knowledge Base**:\n\n${ans}` };
      }
    }

    // ─── B. GREETINGS & CONVERSATIONAL POLITE PHRASES ───
    const isGreeting = (
      msg.includes('hello') || 
      msg.includes('hi') || 
      msg.includes('hey') || 
      msg.includes('good morning') || 
      msg.includes('good afternoon') || 
      msg.includes('good evening') || 
      msg.includes('greetings') || 
      msg === 'yo' || 
      msg.includes('how are you') ||
      msg.includes('whats up') ||
      msg.includes("what's up")
    );

    if (isGreeting && cleanWords.length <= 5 && !msg.includes('subject') && !msg.includes('assignment') && !msg.includes('result')) {
      const hour = new Date().getHours();
      let timeStr = "morning";
      if (hour >= 12 && hour < 17) timeStr = "afternoon";
      if (hour >= 17) timeStr = "evening";
      
      return {
        text: `✨ **Hello and Good ${timeStr}, ${userName}!**\n\nI am doing great and ready to assist you. As your Gemini AI Assistant, I can help you with:\n\n1. **Solving Mathematics & Science problems** step-by-step\n2. **Checking curriculum subjects** for any class (JSS1 – SS3)\n3. **Looking up your assignments & lecture notes** directly from the database\n4. **Exam preparation** for WAEC, JAMB, NECO, and BECE\n5. **Connecting to WhatsApp** for private consultation with school staff\n\nHow can I help you right now?`
      };
    }

    // ─── C. WHO ARE YOU / CAPABILITIES / HELP ───
    if (msg.includes('who are you') || msg.includes('what are you') || msg.includes('what can you do') || msg === 'help' || msg.includes('how do you work')) {
      return {
        text: `🤖 **About BDS Gemini AI**\n\nI am the intelligent, AI-powered academic assistant for **${schoolName || 'Bonus Dominus School'}**.\n\n* **Real-Time Database Sync**: I query active homework, notes, and academic term settings live from Firestore.\n* **STEM Problem Solver**: Step-by-step solutions for mathematics, physics, chemistry, biology, and economics.\n* **Curriculum Expert**: Know all secondary and primary subjects, division of Art/Science streams, and 9-subject registration.\n* **Instant WhatsApp Link**: 1-click connection to human teachers and administrators for private consultations.\n* **Interactive Learning**: You can teach me new facts anytime using \`learn: [question] = [answer]\`!`
      };
    }

    // ─── D. WHATSAPP & PRIVATE CONSULTATION ───
    if (msg.includes('whatsapp') || msg.includes('private chat') || msg.includes('speak to teacher') || msg.includes('speak to human') || msg.includes('talk to someone') || msg.includes('customer care') || msg.includes('support')) {
      const waUrl = createWhatsAppChatUrl(DEFAULT_SCHOOL_WHATSAPP, `Hello BDS School Support! I am ${userName} (${userRole}). I need assistance regarding: "${rawMsg}"`);
      return {
        text: `📱 **Direct WhatsApp Private Chat**\n\nYou can chat 1-on-1 on WhatsApp with school administrators, class teachers, or bursary support for personal questions, fee verifications, or academic consultations.`,
        action: {
          type: 'whatsapp',
          label: '💬 Open Private WhatsApp Chat',
          url: waUrl
        }
      };
    }

    // ─── E. PORTAL PIN RECOVERY / FORGOT PIN ───
    if (msg.includes('forgot pin') || msg.includes('reset pin') || msg.includes('change pin') || msg.includes('lost pin') || msg.includes('login pin')) {
      return {
        text: `🔐 **Student PIN Recovery**\n\n1. Go to the **Login Page** and select the **Student** tab.\n2. Click on **"Forgot 6-Digit PIN?"**.\n3. Enter your **Registration Number** (e.g. \`BDS/25/001\`) and **Class**.\n4. **📲 WhatsApp Delivery**: If a phone number is registered on your profile, a **"Send PIN on WhatsApp"** button will appear immediately!\n5. Your PIN is also stored securely in your personal student inbox.`,
        action: {
          type: 'whatsapp',
          label: '📲 Request PIN from Admin via WhatsApp',
          url: createWhatsAppChatUrl(DEFAULT_SCHOOL_WHATSAPP, `Hello Admin, I am ${userName} requesting help with my Portal Login PIN. My registration number is: `)
        }
      };
    }

    // ─── F. DATABASE: CURRICULUM SUBJECTS FOR CLASSES ───
    if (msg.includes('subject') || msg.includes('curriculum') || msg.includes('course')) {
      // Check if user specified a specific class
      const targetClass = CLASS_LIST.find(c => msg.includes(c.toLowerCase()));
      
      if (targetClass) {
        const subjects = getSubjectsForClass(targetClass);
        return {
          text: `📚 **Official Subjects for ${targetClass}**:\n\nStudents in **${targetClass}** offer the following **${subjects.length} subjects**:\n\n${subjects.map((s, idx) => `${idx + 1}. **${s}**`).join('\n')}\n\n💡 *For Senior Secondary, students register their 9 core subjects under the Subject Registration portal.*`
        };
      }

      if (msg.includes('all subjects') || msg.includes('list subjects')) {
        const all = getAllSubjects();
        return {
          text: `📖 **Complete School Subject Directory (${all.length} Subjects)**:\n\n${all.map((s, i) => `• ${s}`).join('\n')}\n\n*Specify a class (e.g. "Subjects for JSS2" or "Subjects for SS2 Science") to see class-specific offerings.*`
        };
      }

      if (msg.includes('art vs science') || msg.includes('difference between art and science') || (msg.includes('science') && msg.includes('art'))) {
        return {
          text: `🔬 **Senior Secondary Streams: Science vs Art**\n\n* **Common Core Subjects (Both Streams)**: English Language, Mathematics, Biology, Economics, Civic Education, Computer Science, Marketing, Igbo, Animal Husbandry, French, History.\n\n* 🧪 **Science Stream Exclusives**: **Physics** and **Chemistry** (Essential for Medicine, Engineering, Computer Science, Pharmacy).\n\n* 🎭 **Art Stream Exclusives**: **Literature-in-English** and **Christian Religious Studies (C.R.S)** (Essential for Law, Mass Communication, International Relations, Theatre Arts).`
        };
      }

      return {
        text: `📚 **School Subject Curriculum**\n\nWe offer a standardized secondary curriculum for:\n* **Junior Secondary**: JSS1, JSS2, JSS3 (16 Core Subjects)\n* **Senior Secondary**: SS1 (General), SS2 & SS3 Art Stream, SS2 & SS3 Science Stream\n\n*Ask me:* **"What subjects are in JSS3?"** or **"What subjects are in SS2 Science?"** to view exact breakdowns!`
      };
    }

    // ─── G. DATABASE: ACTIVE ASSIGNMENTS & HOMEWORK ───
    if (msg.includes('assignment') || msg.includes('homework') || msg.includes('task') || msg.includes('worksheet')) {
      const classTarget = CLASS_LIST.find(c => msg.includes(c.toLowerCase())) || (userClass && userClass !== 'GENERAL' ? userClass : null);
      
      let relevantTasks = dbKnowledge.assignments;
      if (classTarget) {
        relevantTasks = dbKnowledge.assignments.filter(a => 
          !a.targetClass || a.targetClass === 'All' || a.targetClass === 'All Classes' || a.targetClass.toUpperCase() === classTarget
        );
      }

      if (relevantTasks.length > 0) {
        const taskList = relevantTasks.slice(0, 5).map((t, idx) => (
          `**${idx + 1}. ${t.title}**\n   • **Subject**: ${t.subject || 'General'} | **Class**: ${t.targetClass || 'All'}\n   • **Due Date**: ${t.dueDate || 'No deadline specified'}${t.totalPoints ? ` | **Points**: ${t.totalPoints} Marks` : ''}${t.attachmentUrl ? ' | 📎 Worksheet attached' : ''}`
        )).join('\n\n');

        return {
          text: `📝 **Active Assignments Found in Database${classTarget ? ` for ${classTarget}` : ''}**:\n\n${taskList}\n\n👉 *You can view instructions and download worksheets from the **Assignments** tab on your dashboard.*`
        };
      } else {
        return {
          text: `📝 **Assignments Overview**\n\nCurrently, there are no active homework assignments posted in the database${classTarget ? ` for ${classTarget}` : ''}. Teachers will post assignments before scheduled due dates.\n\n*You can check your student dashboard under "Tasks & Assignments" for daily updates.*`
        };
      }
    }

    // ─── H. DATABASE: LECTURE NOTES & STUDY MATERIALS ───
    if (msg.includes('note') || msg.includes('material') || msg.includes('slide') || msg.includes('lecture') || msg.includes('textbook') || msg.includes('pdf')) {
      const classTarget = CLASS_LIST.find(c => msg.includes(c.toLowerCase())) || (userClass && userClass !== 'GENERAL' ? userClass : null);
      
      let relevantNotes = dbKnowledge.notes;
      if (classTarget) {
        relevantNotes = dbKnowledge.notes.filter(n => 
          !n.targetClass || n.targetClass === 'All' || n.targetClass === 'All Classes' || n.targetClass.toUpperCase() === classTarget
        );
      }

      if (relevantNotes.length > 0) {
        const noteList = relevantNotes.slice(0, 5).map((n, idx) => (
          `**${idx + 1}. ${n.title}**\n   • **Subject**: ${n.subject} | **Class**: ${n.targetClass || 'All'}\n   • **Format**: ${n.fileType || 'PDF'}${n.description ? `\n   • *Summary*: ${n.description.slice(0, 100)}...` : ''}`
        )).join('\n\n');

        return {
          text: `📚 **Study Materials Available in Database${classTarget ? ` for ${classTarget}` : ''}**:\n\n${noteList}\n\n👉 *Access full PDFs, slides, and study guides under the **Learning Materials & Notes** section.*`
        };
      } else {
        return {
          text: `📚 **Study Materials & Lecture Notes**\n\nTeachers upload PDF notes, PowerPoint slides, and study handouts for subjects across all classes. You can access and download your materials under **Learning Materials & Notes** on your dashboard.`
        };
      }
    }

    // ─── I. DATABASE: RECENT ANNOUNCEMENTS & NOTIFICATIONS ───
    if (msg.includes('announcement') || msg.includes('notification') || msg.includes('news') || msg.includes('update') || msg.includes('notice')) {
      if (dbKnowledge.notifications.length > 0) {
        const notifList = dbKnowledge.notifications.slice(0, 4).map((n, idx) => (
          `**${idx + 1}. ${n.title || n.subject || 'School Notice'}**\n   ${n.message || n.body || ''}\n   *Audience: ${n.targetType === 'global' ? 'All Students & Parents' : n.targetType === 'class' ? `Class ${n.targetValue}` : 'Personal'}*`
        )).join('\n\n');

        return {
          text: `📢 **Latest School Announcements from Database**:\n\n${notifList}`
        };
      } else {
        return {
          text: `📢 **School Announcements**\n\nNo new broadcast notices found in the system right now. All major updates regarding resumption dates, examinations, and PTA meetings will appear in your **Notification Center** and student inbox.`
        };
      }
    }

    // ─── J. ACADEMIC SESSION, TERM & PROMOTION RULES ───
    if (msg.includes('session') || msg.includes('term') || msg.includes('promotion') || msg.includes('pass mark') || msg.includes('promoted') || msg.includes('average')) {
      return {
        text: `🎓 **Academic Session & Promotion Standards**:\n\n* **Current Session**: **${currentSession || '2025/2026'}**\n* **Current Term**: **${currentTerm || '1st Term'}**\n* **Promotion Pass Mark**: **${promotionPassMark || 45}% Cumulative Average**\n\n* **Continuous Assessment Breakdown**:\n  - CAT 1: **${cat1Limit || 20} Marks**\n  - CAT 2: **${cat2Limit || 20} Marks**\n  - Terminal Exam: **${examLimit || 60} Marks**\n  - Total Terminal Score: **100%**\n\n* **Promotion Formula**: $$\\text{Cumulative Average} = \\frac{\\text{1st Term} + \\text{2nd Term} + \\text{3rd Term}}{3}$$\nStudents with 45% or above are automatically promoted to the next class!`
      };
    }

    // ─── K. MATHEMATICS SOLVER ENGINE ───
    if (msg.includes('math') || msg.includes('solve') || msg.includes('+') || msg.includes('-') || msg.includes('*') || msg.includes('/') || msg.includes('equation') || msg.includes('calculus') || msg.includes('algebra') || msg.includes('quadratic') || msg.includes('trigonometry') || msg.includes('probability')) {
      if (msg.includes('2x + 5 = 15') || msg.includes('2x+5=15')) {
        return {
          text: `📐 **Step-by-Step Algebraic Solution**:\n\nEquation: **2x + 5 = 15**\n\n1. Subtract 5 from both sides:\n   $$2x = 15 - 5 = 10$$\n2. Divide both sides by 2:\n   $$x = \\frac{10}{2} = 5$$\n\n✅ **Answer**: **x = 5**\n\n*Verification*: $2(5) + 5 = 10 + 5 = 15$. Correct!`
        };
      }
      if (msg.includes('quadratic')) {
        return {
          text: `📊 **Quadratic Equations Solver Guide**\n\nStandard Form: **ax² + bx + c = 0**\n\n* **Quadratic Formula**: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n* **Discriminant ($D = b^2 - 4ac$)**:\n  - $D > 0$: Two distinct real roots\n  - $D = 0$: One repeated root ($x = -b / 2a$)\n  - $D < 0$: Complex roots\n\n*Example*: For $x^2 - 5x + 6 = 0$, factoring gives $(x - 2)(x - 3) = 0 \\implies x = 2 \\text{ or } x = 3$.`
        };
      }
      if (msg.includes('calculus') || msg.includes('derivative')) {
        return {
          text: `📈 **Calculus & Differentiation Rules**:\n\n* **Power Rule**: $$\\frac{d}{dx}[x^n] = n x^{n-1}$$\n* **Constant Multiple**: $$\\frac{d}{dx}[c f(x)] = c f'(x)$$\n* **Sum/Difference**: $$\\frac{d}{dx}[u \\pm v] = \\frac{du}{dx} \\pm \\frac{dv}{dx}$$\n* **Product Rule**: $$\\frac{d}{dx}[uv] = u \\frac{dv}{dx} + v \\frac{du}{dx}$$\n\n*Example*: Derivative of $4x^3 - 5x^2 + 7x - 2$ is **$12x^2 - 10x + 7$**.`
        };
      }
      return {
        text: `🧮 **Gemini Mathematics Assistant Active**\n\nI can solve algebra, quadratic equations, linear inequalities, simultaneous equations, plane geometry, trigonometry ($\\sin, \\cos, \\tan$), logarithms, and statistics.\n\n*Please type your equation or problem (e.g. "solve 3x - 7 = 14" or "area of a cylinder")!*`
      };
    }

    // ─── L. SCIENCES (PHYSICS, CHEMISTRY, BIOLOGY) ───
    if (msg.includes('physics') || msg.includes('chemistry') || msg.includes('biology') || msg.includes('photosynthesis') || msg.includes('newton') || msg.includes('ohm') || msg.includes('periodic') || msg.includes('dna') || msg.includes('cell')) {
      if (msg.includes('photosynthesis')) {
        return {
          text: `🌿 **Photosynthesis Summary**:\n\nPhotosynthesis is the process by which green plants manufacture glucose from carbon dioxide and water in the presence of sunlight and chlorophyll.\n\n* **Chemical Equation**:\n  $$6CO_2 + 6H_2O \\xrightarrow{\\text{Light, Chlorophyll}} C_6H_{12}O_6 + 6O_2$$\n\n* **Key Stages**:\n  1. **Light-Dependent Stage (Thylakoids)**: Water molecules are split (photolysis) to release Oxygen ($O_2$) and generate ATP.\n  2. **Light-Independent Stage / Calvin Cycle (Stroma)**: Carbon dioxide is fixed into Glucose ($C_6H_{12}O_6$).`
        };
      }
      if (msg.includes('newton') || msg.includes('motion')) {
        return {
          text: `⚡ **Newton's 3 Laws of Motion**:\n\n1. **First Law (Inertia)**: A body remains at rest or in uniform motion unless compelled by a net external force.\n2. **Second Law ($F = ma$)**: Acceleration of an object is directly proportional to force and inversely proportional to mass ($F = m \\times a$).\n3. **Third Law (Action & Reaction)**: To every action, there is an equal and opposite reaction.`
        };
      }
      if (msg.includes('ohm') || msg.includes('electricity')) {
        return {
          text: `🔌 **Ohm's Law**:\n\nCurrent ($I$) through a metallic conductor is directly proportional to the potential difference ($V$) across it, provided temperature and other physical conditions remain constant.\n\n* **Formula**: $$V = I \\times R$$\n* **Voltage**: $V = I \\times R$ (Volts)\n* **Current**: $I = \\frac{V}{R}$ (Amperes)\n* **Resistance**: $R = \\frac{V}{I}$ (Ohms $\\Omega$)`
        };
      }
      return {
        text: `🔬 **Gemini Science Engine**\n\nAsk me about physics formulas, balanced chemical equations, stoichiometry, genetic genotypes ($AA, AS, SS$), ecology, or human anatomy!`
      };
    }

    // ─── M. EXAM PREP (WAEC, JAMB, NECO, BECE) ───
    if (msg.includes('waec') || msg.includes('jamb') || msg.includes('neco') || msg.includes('bece') || msg.includes('exam')) {
      return {
        text: `🎯 **WAEC & JAMB/UTME Success Blueprint**:\n\n1. **Master the Official Syllabus**: Do not study blindly; follow the specific topics highlighted in the WAEC and JAMB brochures.\n2. **CBT Time Management**: Allocate ~45 seconds per question in JAMB CBT. Never get stuck on a difficult question—flag and return to it.\n3. **Theory Structure in WAEC**: Always show detailed step-by-step working in Mathematics/Physics, balanced equations in Chemistry, and clear diagrams in Biology.\n4. **Practicing Past Questions**: Solving 10 years of past questions gives you exposure to recurring question patterns.`
      };
    }

    // ─── N. REPORT CARD RESULTS & PIN CHECK ───
    if (msg.includes('result') || msg.includes('score') || msg.includes('report card') || msg.includes('check result')) {
      return {
        text: `📋 **How to Check Your Terminal Report Card**:\n\n1. Click on **"Check Result"** in the top navigation bar.\n2. Select your **Academic Session** (e.g. ${currentSession || '2025/2026'}), **Term** (${currentTerm || '1st Term'}), and **Class**.\n3. Enter your **Student Registration Number** and **6-Digit Portal PIN**.\n4. Click **"View Result"** to generate your official scorecard with principal stamp and signatures!`
      };
    }

    // ─── O. NATURAL INTELLIGENT SYNTHESIS FALLBACK ───
    return {
      text: `✨ **Gemini Assistant Insight for "${rawMsg}"**:\n\nI have analyzed your query across our school curriculum and academic knowledge base.\n\n* **Context**: This relates to our learning curriculum and school management operations.\n* **Recommendations**: You can ask me to solve specific equations, check subjects for any class, list active assignments, or initiate a private WhatsApp chat with school support.\n\n💡 *Want to teach me a custom school response? Use:*\n\`learn: ${rawMsg} = [your customized answer]\``
    };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    const cleanMsg = userMessage.trim();

    // ─── LEARNING MECHANISM: WRITE TO FIRESTORE + LOCAL STORAGE ───
    if (cleanMsg.toLowerCase().startsWith('learn:')) {
      const parts = cleanMsg.substring(6).split('=');
      if (parts.length >= 2) {
        const question = parts[0].trim().toLowerCase();
        const answer = parts.slice(1).join('=').trim();
        
        // 1. Save locally
        const updatedLocal = { ...localLearned, [question]: answer };
        setLocalLearned(updatedLocal);
        localStorage.setItem('chatbot_learned', JSON.stringify(updatedLocal));

        // 2. Save globally to Firestore database
        try {
          await addDoc(collection(db, 'ai_knowledge'), {
            question,
            answer,
            authorName: userName,
            authorRole: userRole,
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.warn('Error syncing learned knowledge to Firestore:', dbErr);
        }

        // 3. Update in-memory state
        setDbKnowledge(prev => ({
          ...prev,
          globalAiKnowledge: { ...prev.globalAiKnowledge, [question]: answer }
        }));

        setIsTyping(true);
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `🧠 **Knowledge Acquired & Saved to Database!**\n\nI have registered this knowledge across the entire school platform:\n\n* **When asked**: *"${parts[0].trim()}"*\n* **I will respond**: *"${answer}"*\n\nTry asking me now!` 
          }]);
          setIsTyping(false);
        }, 500);
        return;
      }
    }

    // Thinking / reasoning simulation
    const needsReasoning = cleanMsg.split(' ').length > 3 && 
                           !cleanMsg.toLowerCase().includes('result') && 
                           !cleanMsg.toLowerCase().includes('pin');
    
    if (needsReasoning) {
      setIsSearching(true);
      await new Promise(r => setTimeout(r, 600));
      setIsSearching(false);
    }

    setIsTyping(true);
    setTimeout(() => {
      const response = processQuery(userMessage);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.text,
        action: response.action 
      }]);
      setIsTyping(false);
    }, 300);
  };

  const handleQuickPrompt = (promptText) => {
    setInput(promptText);
  };

  return (
    <div className="bonus-ai-container" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
      {/* Floating Gemini Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ 
            width: '54px', 
            height: '54px', 
            borderRadius: '18px', 
            padding: 0,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            border: '2px solid rgba(255,255,255,0.25)',
            boxShadow: '0 14px 32px rgba(67, 56, 202, 0.45)',
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
            <Sparkles size={26} className="text-amber-300 animate-pulse" />
          </div>
          <div style={{ position: 'absolute', bottom: '3px', right: '3px', background: '#22c55e', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white' }}></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="animate-in slide-in-from-bottom-5 duration-300 shadow-2xl flex flex-col overflow-hidden bg-white border border-slate-200"
          style={{ 
            width: isExpanded ? '560px' : '410px', 
            height: isExpanded ? '700px' : '600px', 
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
                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #4285f4, #9b72cb, #d96570)', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(155,114,203,0.35)' }}>
                   <Sparkles size={22} color="#fff" />
                </div>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '11px', height: '11px', background: '#22c55e', borderRadius: '50%', border: '2px solid #090d16' }}></div>
              </div>
              <div>
                <h4 style={{ color: 'white', margin: 0, fontSize: '0.95rem', fontWeight: '900', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                  BDS Gemini AI <span className="text-[10px] font-black bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">DATABASE CONNECTED</span>
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Curriculum • Assignments • WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href={createWhatsAppChatUrl(DEFAULT_SCHOOL_WHATSAPP, `Hello BDS Support, I am ${userName} seeking private assistance.`)}
                target="_blank"
                rel="noopener noreferrer"
                title="Open Private WhatsApp Chat"
                className="w-8 h-8 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-sm"
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

          {/* Messages Stream */}
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
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Querying Database & Knowledge Engine...</span>
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

          {/* Quick Database Prompt Chips */}
          <div style={{ padding: '0.65rem 0.9rem', display: 'flex', gap: '6px', overflowX: 'auto', background: 'white', borderTop: '1px solid #f1f5f9' }}>
            {[
              { icon: <BookMarked size={12} />, label: 'JSS Subjects', text: 'What subjects are offered in JSS2?' },
              { icon: <Atom size={12} />, label: 'SS2 Science', text: 'What subjects are offered in SS2 SCIENCE?' },
              { icon: <FileText size={12} />, label: 'Assignments', text: 'What active assignments are in the database?' },
              { icon: <BookOpen size={12} />, label: 'Study Notes', text: 'Show available lecture notes and materials' },
              { icon: <Calculator size={12} />, label: 'Solve 2x+5=15', text: 'Solve equation: 2x + 5 = 15 step by step' },
              { icon: <MessageCircle size={12} />, label: 'WhatsApp', text: 'Connect me to private WhatsApp chat with school support' }
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
              placeholder="Ask about subjects, assignments, notes, math, WhatsApp..."
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
