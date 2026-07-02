import { useState, useRef, useEffect } from "react";

const LOGO_B64 = "/nsche-logo.jpg";

const LIGHT = {
  green:      "#0e7a3c",
  greenDark:  "#085c2c",
  greenLight: "#e6f4ed",
  greenMid:   "#c3e6d0",
  white:      "#ffffff",
  bg:         "#f7fbf9",
  ink:        "#0a1f12",
  muted:      "#5a7a65",
  border:     "#cce8d8",
  card:       "#ffffff",
  navBg:      "#ffffff",
};

const DARK = {
  green:      "#2ecc71",
  greenDark:  "#0e7a3c",
  greenLight: "#0d2e1a",
  greenMid:   "#1a4a2a",
  white:      "#e8f5ee",
  bg:         "#0a1412",
  ink:        "#e8f5ee",
  muted:      "#7ab890",
  border:     "#1e3d2a",
  card:       "#111f16",
  navBg:      "#0d1f15",
};

const courses = {
  "100 Level": {
    "First Semester": [
      { code: "BUK-TCH101", name: "Elementary Mathematics III (Vectors, Geometry and Dynamics)", units: 2 },
      { code: "BUK-TCH103", name: "General Physics II (Electricity and Magnetism)", units: 2 },
      { code: "BUK-TCH105", name: "General Physics IV (Vibrations, Waves and Optics)", units: 2 },
      { code: "CHM101", name: "General Chemistry I", units: 2 },
      { code: "CHM107", name: "General Chemistry Practical I", units: 1 },
      { code: "GET101", name: "Engineer in Society", units: 1 },
      { code: "GST111", name: "Communication in English", units: 2 },
      { code: "MTH101", name: "Elementary Mathematics I", units: 2 },
      { code: "PHY101", name: "General Physics I", units: 2 },
      { code: "PHY107", name: "General Physics Practical I", units: 1 },
    ],
    "Second Semester": [
      { code: "PHY103", name: "General Physics III", units: 2 },
      { code: "CHM102", name: "General Chemistry II", units: 2 },
      { code: "CHM108", name: "General Chemistry Practical II", units: 1 },
      { code: "GST112", name: "Nigerian People and Culture", units: 2 },
      { code: "MTH102", name: "Elementary Mathematics II", units: 2 },
      { code: "PHY108", name: "General Physics Practical II", units: 1 },
      { code: "GET102", name: "Engineering Graphics and Solid Modelling I", units: 2 },
      { code: "TCH101", name: "Introduction to Chemical Engineering", units: 2 },
    ],
  },
  "200 Level": {
    "First Semester": [
      { code: "BUK-TCH201", name: "Applied Electricity I", units: 2 },
      { code: "BUK-TCH203", name: "Engineering Chemistry I", units: 2 },
      { code: "BUK-TCH205", name: "Applied Mechanics", units: 2 },
      { code: "ENT211", name: "Entrepreneurship and Innovation", units: 2 },
      { code: "GET204", name: "Students Workshop Experience", units: 2 },
      { code: "GET209", name: "Engineering Mathematics I", units: 3 },
      { code: "GET206", name: "Fundamentals of Thermodynamics", units: 3 },
      { code: "TCH202", name: "Material Science", units: 3 },
      { code: "GST211", name: "Communication in English", units: 2 },
    ],
    "Second Semester": [
      { code: "BUK-TCH202", name: "Strength of Materials", units: 2 },
      { code: "TCH201", name: "Chemical Engineering Fundamentals", units: 3 },
      { code: "GST212", name: "Philosophy, Logic and Human Existence", units: 2 },
      { code: "GET211", name: "Computing and Software Engineering", units: 3 },
      { code: "GET205", name: "Fundamentals of Fluid Mechanics", units: 3 },
      { code: "GET210", name: "Engineering Mathematics II", units: 3 },
      { code: "TCH206", name: "Statistics for Chemical Engineers", units: 2 },
      { code: "GET299", name: "SIWES I: Students Work Experience Scheme", units: 3 },
    ],
  },
  "300 Level": {
    "First Semester": [
      { code: "BUK-TCH301", name: "Engineering Chemistry II", units: 2 },
      { code: "BUK-TCH303", name: "Engineering Mathematics III", units: 2 },
      { code: "TCH301", name: "Transfer Processes I", units: 2 },
      { code: "TCH303", name: "Separation Processes I", units: 2 },
      { code: "TCH305", name: "Chemical Engineering Laboratories I", units: 1 },
      { code: "TCH307", name: "Biochemical Engineering I", units: 2 },
      { code: "GET307", name: "Introduction to AI, Machine Learning and Convergent Technologies", units: 2 },
      { code: "TCH304", name: "Process Instrumentation", units: 2 },
    ],
    "Second Semester": [
      { code: "BUK-TCH302", name: "Chemical Kinetics and Catalysis", units: 2 },
      { code: "BUK-TCH304", name: "Chemical Engineering Laboratory II", units: 2 },
      { code: "TCH302", name: "Chemical Engineering Thermodynamics", units: 2 },
      { code: "GET304", name: "Technical Writing and Communication", units: 3 },
      { code: "GET306", name: "Renewable Energy Systems and Technologies", units: 3 },
      { code: "GST312", name: "Peace and Conflict Resolution", units: 2 },
      { code: "ENT312", name: "Venture and Creation", units: 2 },
      { code: "TCH308", name: "Numerical Methods in Chemical Engineering", units: 2 },
      { code: "GET399", name: "SIWES II: Students Work Experience Scheme", units: 4 },
    ],
  },
};

const allCourses = Object.entries(courses).flatMap(([level, sems]) =>
  Object.entries(sems).flatMap(([sem, list]) =>
    list.map(c => ({ ...c, level, semester: sem }))
  )
);

const EXCO_POSITIONS = [
  { key: "president", role: "President", icon: "👑" },
  { key: "vp", role: "Vice President", icon: "⭐" },
  { key: "secGeneral", role: "Secretary-General", icon: "📝" },
  { key: "assistSecGeneral", role: "Assistant Secretary-General", icon: "🗒️" },
  { key: "socialDirector", role: "Social Director", icon: "🎉" },
  { key: "proI", role: "PRO I", icon: "📢" },
  { key: "proII", role: "PRO II", icon: "📣" },
  { key: "welfareDirector", role: "Welfare Director", icon: "🤝" },
  { key: "treasurer", role: "Treasurer", icon: "💼" },
  { key: "assistTreasurer", role: "Assistant Treasurer", icon: "💰" },
  { key: "financialSecretary", role: "Financial Secretary", icon: "📒" },
  { key: "academicDirector", role: "Academic Director", icon: "📚" },
  { key: "assistAcademicDirector", role: "Assistant Academic Director", icon: "📖" },
  { key: "sportDirector", role: "Sport Director", icon: "⚽" },
  { key: "assistSportDirector", role: "Assistant Sport Director", icon: "🏃" },
  { key: "senator", role: "Senator", icon: "🏛️" },
  { key: "auditorGeneral", role: "Auditor General", icon: "🔍" },
];

const blankExco = () => Object.fromEntries(EXCO_POSITIONS.map(p => [p.key, "To be updated"]));

const legacy = [
  { year: "2025/2026", ...blankExco() },
  { year: "2024/2025", ...blankExco() },
  { year: "2023/2024", ...blankExco() },
  { year: "2022/2023", ...blankExco() },
];

// ── GPA Calculator helpers ─────────────────────────────────
const GRADE_POINTS = { "A": 5, "B": 4, "C": 3, "D": 2, "E": 1, "F": 0 };

// ── Storage helpers for Academic Help board ────────────────
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const GEMINI_KEY = "AQ.Ab8RN6J8AgdWygttymgSrSrm4Te34paZouolNZpTQ0oi8mnrLw";

async function askGemini(history) {
  const contents = history.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: `You are ChemBot, the official AI study assistant for NSCHE BUK (Nigerian Society of Chemical Engineers, Bayero University Kano). Help 100–300 level chemical engineering students with step-by-step solutions. Format responses clearly using numbered steps, "Given:/Find:/Solution:/Answer:" structure. Use real Unicode symbols: α β γ δ Δ θ λ μ ρ σ ∫ √ ∞ ∂ × ± ≈ ≤ ≥ — never LaTeX. Be concise, direct and educational.` }]
        },
        contents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }
      })
    }
  );
  if (!res.ok) {
    const err = await res.json();
    console.error("Gemini error:", err);
    throw new Error("API error");
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
}

function renderInline(text, baseKey) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${baseKey}-${idx}`} style={{ fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${baseKey}-${idx}`}>{part}</span>;
  });
}

function formatMessage(text) {
  return text.split("\n").map((line, i) => {
    const t = line.trim();
    if (/^#{1,3}\s+/.test(t)) return <div key={i} style={{ fontWeight: 900, fontSize: 15, marginTop: 10, marginBottom: 2 }}>{renderInline(t.replace(/^#{1,3}\s+/, ""), i)}</div>;
    if (/^-{3,}$/.test(t)) return <div key={i} style={{ borderTop: "1px solid currentColor", opacity: 0.2, margin: "8px 0" }} />;
    if (/^\d+\.\s/.test(t)) return <div key={i} style={{ paddingLeft: 8, marginTop: 4 }}>{renderInline(t, i)}</div>;
    if (t.startsWith("- ") || t.startsWith("* ")) return <div key={i} style={{ paddingLeft: 12, marginTop: 2 }}>• {renderInline(t.slice(2), i)}</div>;
    if (line.match(/^(Given:|Find:|Solution:|Answer:|Note:)/)) return <div key={i} style={{ fontWeight: 700, marginTop: 8, color: "#0e7a3c" }}>{renderInline(line, i)}</div>;
    if (t === "") return <div key={i} style={{ height: 6 }} />;
    return <div key={i}>{renderInline(line, i)}</div>;
  });
}

export default function ChemBaseBUK() {
  const [tab, setTab] = useState("home");
  const [dark, setDark] = useState(false);
  const [level, setLevel] = useState("300 Level");
  const [semester, setSemester] = useState("First Semester");
  const [openCourse, setOpenCourse] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [expandedExco, setExpandedExco] = useState("2025/2026");
  const chatRef = useRef(null);

  // ChemBot state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatFile, setChatFile] = useState(null);
  const chatFileRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatHistory, chatLoading]);
  const C = dark ? DARK : LIGHT;

  // GPA calculator state
  const [gpaCourses, setGpaCourses] = useState([
    { id: 1, name: "", units: "", grade: "A" },
    { id: 2, name: "", units: "", grade: "A" },
    { id: 3, name: "", units: "", grade: "A" },
  ]);

  // Academic Help / Q&A board state
  const [questions, setQuestions] = useState([]);
  const [qLoading, setQLoading] = useState(true);
  const [showAskForm, setShowAskForm] = useState(false);
  const [newQ, setNewQ] = useState({ name: "", course: "", question: "" });
  const [newQFile, setNewQFile] = useState(null);
  const [adminMode, setAdminMode] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const ADMIN_PIN = "2580";
  const [answerDrafts, setAnswerDrafts] = useState({});
  const answerFileRef = useRef(null);
  const [pendingAnswerFile, setPendingAnswerFile] = useState({});

  const isGlobalSearch = globalSearch.trim().length > 0;
  const globalResults = isGlobalSearch
    ? allCourses.filter(c =>
        c.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(globalSearch.toLowerCase())
      )
    : [];

  const currentCourses = (courses[level][semester] || []).filter(
    c => c.name.toLowerCase().includes(courseSearch.toLowerCase()) || c.code.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const totalCourses = allCourses.length;

  // ── GPA calculator logic ──
  const addGpaCourse = () => {
    setGpaCourses(prev => [...prev, { id: Date.now(), name: "", units: "", grade: "A" }]);
  };
  const removeGpaCourse = (id) => {
    setGpaCourses(prev => prev.filter(c => c.id !== id));
  };
  const updateGpaCourse = (id, field, value) => {
    setGpaCourses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  const gpaResult = (() => {
    let totalUnits = 0;
    let totalPoints = 0;
    gpaCourses.forEach(c => {
      const units = parseFloat(c.units);
      if (!isNaN(units) && units > 0) {
        totalUnits += units;
        totalPoints += units * GRADE_POINTS[c.grade];
      }
    });
    return totalUnits > 0 ? (totalPoints / totalUnits).toFixed(2) : null;
  })();

  // ── Academic Help / Q&A board logic ──
  useEffect(() => {
    const loadQuestions = async () => {
      setQLoading(true);
      try {
        const result = await window.storage.list("question:", true);
        if (result && result.keys && result.keys.length > 0) {
          const items = await Promise.all(
            result.keys.map(async (k) => {
              try {
                const r = await window.storage.get(k, true);
                return r ? JSON.parse(r.value) : null;
              } catch {
                return null;
              }
            })
          );
          const valid = items.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp);
          setQuestions(valid);
        } else {
          setQuestions([]);
        }
      } catch {
        setQuestions([]);
      }
      setQLoading(false);
    };
    loadQuestions();
  }, []);

  const submitQuestion = async () => {
    if (!newQ.name.trim() || !newQ.course.trim() || !newQ.question.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    const id = "q" + Date.now();
    const questionObj = {
      id, name: newQ.name.trim(), course: newQ.course.trim(),
      question: newQ.question.trim(), timestamp: Date.now(),
      questionFile: newQFile || null,
      answerText: null, answerFile: null,
    };
    try {
      await window.storage.set(`question:${id}`, JSON.stringify(questionObj), true);
      setQuestions(prev => [questionObj, ...prev]);
      setNewQ({ name: "", course: "", question: "" });
      setNewQFile(null);
      setShowAskForm(false);
    } catch {
      alert("Couldn't submit. Please check your connection and try again.");
    }
  };

  const handleQuestionFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; }
    try {
      const base64 = await fileToBase64(file);
      setNewQFile({ name: file.name, type: file.type, base64 });
    } catch { alert("Couldn't read file."); }
    e.target.value = "";
  };

  const handleAdminClick = () => {
    if (adminMode) { setAdminMode(false); return; }
    setShowPinPrompt(true);
    setPinInput("");
  };

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setAdminMode(true);
      setShowPinPrompt(false);
      setPinInput("");
    } else {
      alert("Incorrect PIN.");
      setPinInput("");
    }
  };

  const handleAnswerFileSelect = async (e, qId) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setPendingAnswerFile(prev => ({ ...prev, [qId]: { name: file.name, type: file.type, base64 } }));
    } catch {
      alert("Couldn't read file.");
    }
    e.target.value = "";
  };

  const submitAnswer = async (qId) => {
    const text = answerDrafts[qId]?.trim() || "";
    const file = pendingAnswerFile[qId] || null;
    if (!text && !file) {
      alert("Add a text answer or attach a file.");
      return;
    }
    const updated = questions.map(q =>
      q.id === qId ? { ...q, answerText: text || null, answerFile: file } : q
    );
    const target = updated.find(q => q.id === qId);
    try {
      await window.storage.set(`question:${qId}`, JSON.stringify(target), true);
      setQuestions(updated);
      setAnswerDrafts(prev => ({ ...prev, [qId]: "" }));
      setPendingAnswerFile(prev => ({ ...prev, [qId]: null }));
    } catch {
      alert("Couldn't save answer. Try again.");
    }
  };

  const handleChatFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; }
    try {
      const base64 = await fileToBase64(file);
      setChatFile({ name: file.name, type: file.type, base64 });
    } catch { alert("Couldn't read file."); }
    e.target.value = "";
  };

  const handleChatSend = async () => {
    if ((!chatInput.trim() && !chatFile) || chatLoading) return;
    const userText = chatInput.trim() || `[Uploaded: ${chatFile?.name}]`;
    let userContent;
    if (chatFile && chatFile.type.startsWith("image/")) {
      userContent = [
        { inlineData: { mimeType: chatFile.type, data: chatFile.base64 } },
        { text: chatInput.trim() || "Please analyze this image and help me understand it for my ChE studies." }
      ];
    } else {
      userContent = chatInput.trim();
    }
    const newHistory = [...chatHistory, { role: "user", content: userContent, display: userText }];
    setChatHistory(newHistory);
    setChatInput("");
    setChatFile(null);
    setChatLoading(true);
    try {
      const reply = await askGemini(newHistory);
      setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Network error. Please check your connection and try again." }]);
    }
    setChatLoading(false);
  };

  const navItems = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "pq", label: "PQs", icon: "📂" },
    { id: "ai", label: "ChemBot", icon: "🤖" },
    { id: "help", label: "Help", icon: "🙋" },
    { id: "gpa", label: "GPA", icon: "🧮" },
    { id: "legacy", label: "Legacy", icon: "🏆" },
  ];

  const s = {
    card: { background: C.card, borderRadius: 14, border: `1.5px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: C.bg, color: C.ink, paddingBottom: 80, transition: "background 0.3s, color 0.3s" }}>

      {/* TOP NAV */}
      <nav style={{ background: C.greenDark, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={LOGO_B64} alt="NSCHE"
            style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>ChemBase BUK</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>NSCHE · BUK Chapter</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => setDark(!dark)} style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16, color: "#fff" }}>{dark ? "☀️" : "🌙"}</button>
          {navItems.slice(1).map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              background: tab === n.id ? "rgba(255,255,255,0.18)" : "transparent",
              color: tab === n.id ? "#fff" : "rgba(255,255,255,0.55)",
              border: "none", padding: "7px 9px", borderRadius: 8, cursor: "pointer", fontSize: 17
            }}>{n.icon}</button>
          ))}
        </div>
      </nav>

      {/* HOME */}
      {tab === "home" && (
        <div>
          <div style={{ background: `linear-gradient(135deg, ${LIGHT.greenDark} 0%, ${LIGHT.green} 70%, #1a9e52 100%)`, padding: "40px 24px 36px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            <img src={LOGO_B64} alt="NSCHE"
              style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.4)", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", marginBottom: 14 }} />
            <h1 style={{ color: "#fff", margin: "0 0 6px", fontSize: 26, fontWeight: 900 }}>ChemBase BUK</h1>
            <p style={{ color: "rgba(255,255,255,0.75)", margin: "0 0 24px", fontSize: 13 }}>Nigerian Society of Chemical Engineers · Bayero University Kano</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              {[{ v: totalCourses, l: "Courses" }, { v: "3", l: "Levels" }, { v: "Free", l: "Always" }].map((st, i) => (
                <div key={i} style={{ textAlign: "center", padding: "12px 20px", background: "rgba(255,255,255,0.15)", borderRadius: 12, minWidth: 75 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{st.v}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{st.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "20px 16px 0", maxWidth: 600, margin: "0 auto" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
              <input placeholder="Search any course across all levels..."
                value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
                style={{ width: "100%", padding: "12px 16px 12px 40px", borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none", boxSizing: "border-box", background: C.card, color: C.ink, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }} />
            </div>
            {isGlobalSearch && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {globalResults.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: C.muted }}>No courses found</div>
                ) : globalResults.map((c, i) => (
                  <div key={i} style={{ ...s.card, padding: "12px 16px", cursor: "pointer" }}
                    onClick={() => { setLevel(c.level); setSemester(c.semester); setTab("pq"); setGlobalSearch(""); }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ background: C.greenLight, color: C.green, fontWeight: 800, fontSize: 11, padding: "2px 10px", borderRadius: 20 }}>{c.code}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{c.level} · {c.semester}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isGlobalSearch && (
            <div style={{ padding: "16px 16px 0", maxWidth: 600, margin: "0 auto" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Quick Access</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { icon: "📂", title: "Past Questions", desc: "100L – 300L courses", action: () => setTab("pq"), color: C.green },
                  { icon: "🤖", title: "ChemBot AI", desc: "Free AI study assistant", action: () => setTab("ai"), color: "#1565c0" },
                  { icon: "🙋", title: "Academic Help", desc: "Ask & get solutions", action: () => setTab("help"), color: "#b8860b" },
                  { icon: "🧮", title: "GPA Calculator", desc: "Compute your GPA", action: () => setTab("gpa"), color: "#6a1b9a" },
                ].map((card, i) => (
                  <div key={i} onClick={card.action} style={{ ...s.card, padding: "16px 14px", cursor: "pointer" }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{card.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: card.color, marginBottom: 3 }}>{card.title}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{card.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, marginBottom: 8, padding: "14px 16px", background: C.greenLight, borderRadius: 12, borderLeft: `4px solid ${C.green}` }}>
                <div style={{ fontWeight: 700, color: C.green, fontSize: 13 }}>📢 Welcome to ChemBase BUK</div>
                <p style={{ margin: "6px 0 0", color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                  Your official NSCHE BUK academic resource hub. Browse past questions, get instant answers from ChemBot AI (upload notes, images or PDFs), ask for academic help, calculate your GPA, and explore the society's legacy.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAST QUESTIONS */}
      {tab === "pq" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
          <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 20 }}>Past Questions</h2>
          <p style={{ margin: "0 0 14px", color: C.muted, fontSize: 13 }}>Browse by level and semester.</p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {Object.keys(courses).map(l => (
              <button key={l} onClick={() => { setLevel(l); setOpenCourse(null); setCourseSearch(""); setSemester("First Semester"); }} style={{
                padding: "7px 16px", borderRadius: 24, border: `2px solid ${level === l ? C.green : C.border}`,
                background: level === l ? C.green : C.card, color: level === l ? "#fff" : C.green,
                fontWeight: 700, fontSize: 13, cursor: "pointer"
              }}>{l}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["First Semester", "Second Semester"].map(sem => (
              <button key={sem} onClick={() => { setSemester(sem); setOpenCourse(null); }} style={{
                padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${semester === sem ? C.green : C.border}`,
                background: semester === sem ? C.greenLight : C.card, color: semester === sem ? C.green : C.muted,
                fontWeight: semester === sem ? 700 : 400, fontSize: 12, cursor: "pointer"
              }}>{sem}</button>
            ))}
          </div>

          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }}>🔍</span>
            <input placeholder="Search course or code..." value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 16px 10px 36px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none", boxSizing: "border-box", background: C.card, color: C.ink }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {currentCourses.map(course => (
              <div key={course.code} style={{ ...s.card, border: `1.5px solid ${openCourse === course.code ? C.green : C.border}`, boxShadow: openCourse === course.code ? `0 0 0 3px ${C.greenMid}` : "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <div onClick={() => setOpenCourse(openCourse === course.code ? null : course.code)} style={{ padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ background: C.greenLight, color: C.green, fontWeight: 800, fontSize: 11, padding: "2px 10px", borderRadius: 20 }}>{course.code}</span>
                      <span style={{ fontSize: 11, color: C.muted }}>{course.units} units</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.ink, lineHeight: 1.4 }}>{course.name}</div>
                  </div>
                  <span style={{ color: C.green, fontSize: 16, marginLeft: 10 }}>{openCourse === course.code ? "▲" : "▼"}</span>
                </div>
                {openCourse === course.code && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", background: C.greenLight }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Available Years</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                      {["2022", "2023", "2024", "2025", "2026"].map(yr => (
                        <button key={yr} onClick={() => alert(`"${course.code} — ${yr}" will be downloadable once uploaded.`)}
                          style={{ background: C.card, border: `1.5px solid ${C.green}`, color: C.green, padding: "6px 14px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>📄 {yr}</button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>Files activated once uploaded by the admin.</div>
                  </div>
                )}
              </div>
            ))}
            {currentCourses.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 600 }}>No courses match your search</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHEMBOT */}
      {tab === "ai" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", height: "calc(100vh - 140px)" }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 20 }}>🤖 ChemBot</h2>
            <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Free AI study assistant — powered by Google Gemini.</p>
          </div>
          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: 14, background: C.card, borderRadius: 14, border: `1.5px solid ${C.border}`, marginBottom: 12 }}>
            {chatHistory.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 16px", color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🧪</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: C.ink }}>Ask me anything ChE</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>Step-by-step solutions for any problem.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["Solve heat conduction through a composite wall", "Explain Raoult's Law with an example", "What is the Seebeck effect in thermocouples?"].map(q => (
                    <button key={q} onClick={() => setChatInput(q)} style={{ background: C.greenLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: C.green, fontWeight: 600, textAlign: "left" }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13 }}>🤖</div>
                  )}
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? C.green : C.greenLight, color: m.role === "user" ? "#fff" : C.ink, fontSize: 14, lineHeight: 1.7 }}>
                    {m.role === "assistant" ? formatMessage(m.content) : (m.display || (typeof m.content === "string" ? m.content : m.display))}
                  </div>
                </div>
                {m.role === "assistant" && (
                  <button onClick={() => { const msg = encodeURIComponent("ChemBot (ChemBase BUK):\n\n" + m.content); window.open(`https://wa.me/?text=${msg}`, "_blank"); }}
                    style={{ marginLeft: 36, background: "#25d366", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    Share on WhatsApp
                  </button>
                )}
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
                <div style={{ padding: "10px 14px", background: C.greenLight, borderRadius: "16px 16px 16px 4px", color: C.muted, fontSize: 14 }}>Thinking...</div>
              </div>
            )}
          </div>
          {chatFile && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.greenLight, border: `1.5px solid ${C.green}`, borderRadius: 10, padding: "8px 12px", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.green }}>📎 {chatFile.name}</span>
              <button onClick={() => setChatFile(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <input type="file" ref={chatFileRef} accept="image/*,application/pdf" onChange={handleChatFileSelect} style={{ display: "none" }} />
            <button onClick={() => chatFileRef.current?.click()} title="Upload image or PDF" style={{ background: C.greenLight, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 16, cursor: "pointer", color: C.green }}>📎</button>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChatSend()}
              placeholder={chatFile ? "Add a message (optional)..." : "Ask a ChE question..."}
              style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none", background: C.card, color: C.ink }} />
            <button onClick={handleChatSend} disabled={chatLoading || (!chatInput.trim() && !chatFile)} style={{ background: C.green, color: "#fff", border: "none", padding: "11px 18px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: chatLoading ? "not-allowed" : "pointer", opacity: chatLoading || (!chatInput.trim() && !chatFile) ? 0.5 : 1 }}>Send</button>
          </div>
        </div>
      )}

      {/* GPA CALCULATOR */}
      {tab === "gpa" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
          <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 20 }}>🧮 GPA Calculator</h2>
          <p style={{ margin: "0 0 18px", color: C.muted, fontSize: 13 }}>Enter your courses, units, and grades to compute your GPA.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {gpaCourses.map((c, idx) => (
              <div key={c.id} style={{ ...s.card, padding: "12px", display: "flex", gap: 8, alignItems: "center" }}>
                <input placeholder={`Course ${idx + 1}`} value={c.name} onChange={e => updateGpaCourse(c.id, "name", e.target.value)}
                  style={{ flex: 2, minWidth: 0, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", background: C.bg, color: C.ink }} />
                <input placeholder="Units" type="number" min="0" value={c.units} onChange={e => updateGpaCourse(c.id, "units", e.target.value)}
                  style={{ width: 56, padding: "8px 6px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", background: C.bg, color: C.ink, textAlign: "center" }} />
                <select value={c.grade} onChange={e => updateGpaCourse(c.id, "grade", e.target.value)}
                  style={{ width: 56, padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", background: C.bg, color: C.ink }}>
                  {Object.keys(GRADE_POINTS).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <button onClick={() => removeGpaCourse(c.id)} style={{ background: "none", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer", padding: "0 4px" }}>✕</button>
              </div>
            ))}
          </div>

          <button onClick={addGpaCourse} style={{
            width: "100%", background: C.greenLight, border: `1.5px dashed ${C.green}`, color: C.green,
            padding: "10px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 18
          }}>+ Add Course</button>

          <div style={{
            background: `linear-gradient(135deg, ${LIGHT.greenDark}, ${LIGHT.green})`,
            borderRadius: 16, padding: "24px", textAlign: "center", color: "#fff"
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Your GPA</div>
            <div style={{ fontSize: 40, fontWeight: 900 }}>{gpaResult ?? "—"}</div>
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
              {gpaResult ? (gpaResult >= 4.5 ? "Excellent! Keep it up 🎉" : gpaResult >= 3.5 ? "Good standing 👍" : "Push harder next semester 💪") : "Enter units and grades above"}
            </div>
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: C.greenLight, borderRadius: 10, fontSize: 12, color: C.muted }}>
            Grade points: A=5, B=4, C=3, D=2, E=1, F=0 — standard BUK scale. Adjust if your department uses a different scale.
          </div>
        </div>
      )}

      {/* ACADEMIC HELP */}
      {tab === "help" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 20 }}>🙋 Academic Help</h2>
              <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Ask a question. Solutions are uploaded by the admin.</p>
            </div>
            <button onClick={handleAdminClick} style={{
              background: adminMode ? C.green : C.greenLight, color: adminMode ? "#fff" : C.green,
              border: `1.5px solid ${C.green}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
            }}>{adminMode ? "Admin ON" : "Admin"}</button>
          </div>

          {showPinPrompt && (
            <div style={{ ...s.card, padding: "16px", marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🔐 Enter Admin PIN</div>
              <input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
                placeholder="Enter PIN"
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 18, outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: 6, marginBottom: 10, background: C.bg, color: C.ink }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowPinPrompt(false)} style={{ flex: 1, background: C.greenLight, border: "none", borderRadius: 8, padding: "9px", color: C.muted, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button onClick={handlePinSubmit} style={{ flex: 2, background: C.green, border: "none", borderRadius: 8, padding: "9px", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Unlock</button>
              </div>
            </div>
          )}

          {!showAskForm ? (
            <button onClick={() => setShowAskForm(true)} style={{
              width: "100%", background: C.green, color: "#fff", border: "none", padding: "13px",
              borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", marginBottom: 18
            }}>+ Ask a Question</button>
          ) : (
            <div style={{ ...s.card, padding: "16px", marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Ask Your Question</div>
              <input placeholder="Your name" value={newQ.name} onChange={e => setNewQ(p => ({ ...p, name: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10, background: C.bg, color: C.ink }} />
              <input placeholder="Course code (e.g. TCH301)" value={newQ.course} onChange={e => setNewQ(p => ({ ...p, course: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10, background: C.bg, color: C.ink }} />
              <textarea placeholder="Describe your question or problem..." rows={4} value={newQ.question} onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10, background: C.bg, color: C.ink, resize: "vertical" }} />

              <input type="file" id="qfile" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleQuestionFileSelect} />
              <button onClick={() => document.getElementById("qfile").click()} style={{
                width: "100%", background: C.greenLight, border: `1.5px dashed ${C.border}`, borderRadius: 8,
                padding: "9px", fontSize: 13, color: C.green, fontWeight: 600, cursor: "pointer", marginBottom: newQFile ? 6 : 10
              }}>📎 Attach image or PDF (optional)</button>
              {newQFile && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.greenLight, borderRadius: 8, padding: "6px 12px", marginBottom: 10, fontSize: 12, color: C.green }}>
                  <span>📎 {newQFile.name}</span>
                  <button onClick={() => setNewQFile(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15 }}>✕</button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowAskForm(false); setNewQFile(null); }} style={{ flex: 1, background: C.greenLight, color: C.muted, border: "none", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={submitQuestion} style={{ flex: 2, background: C.green, color: "#fff", border: "none", padding: "10px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Submit Question</button>
              </div>
            </div>
          )}

          {qLoading ? (
            <div style={{ textAlign: "center", padding: 30, color: C.muted }}>Loading questions...</div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 600 }}>No questions yet. Be the first to ask!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {questions.map(q => (
                <div key={q.id} style={{ ...s.card, padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ background: C.greenLight, color: C.green, fontWeight: 800, fontSize: 11, padding: "2px 10px", borderRadius: 20 }}>{q.course}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>by {q.name}</span>
                    {(q.answerText || q.answerFile) && (
                      <span style={{ background: "#e6f4ed", color: C.green, fontWeight: 700, fontSize: 10, padding: "2px 8px", borderRadius: 20 }}>✅ Answered</span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.5, marginBottom: 6 }}>{q.question}</div>
                  {q.questionFile && (
                    <div style={{ marginBottom: 10 }}>
                      {q.questionFile.type?.startsWith("image/") ? (
                        <img src={`data:${q.questionFile.type};base64,${q.questionFile.base64}`} alt="Attached"
                          style={{ maxWidth: "100%", borderRadius: 8, border: `1px solid ${C.border}` }} />
                      ) : (
                        <div style={{ background: C.greenLight, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.green, fontWeight: 600 }}>
                          📎 {q.questionFile.name}
                        </div>
                      )}
                    </div>
                  )}

                  {q.answerText && (
                    <div style={{ background: C.greenLight, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: C.ink, marginBottom: 8, lineHeight: 1.6 }}>
                      <strong style={{ color: C.green }}>Answer: </strong>{q.answerText}
                    </div>
                  )}
                  {q.answerFile && (
                    <div style={{ background: C.greenLight, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.green, fontWeight: 700, marginBottom: 8 }}>
                      📎 {q.answerFile.name} (attached)
                    </div>
                  )}

                  {adminMode && !q.answerText && !q.answerFile && (
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 4 }}>
                      <textarea placeholder="Type your answer..." rows={2} value={answerDrafts[q.id] || ""}
                        onChange={e => setAnswerDrafts(prev => ({ ...prev, [q.id]: e.target.value }))}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8, background: C.bg, color: C.ink, resize: "vertical" }} />
                      {pendingAnswerFile[q.id] && (
                        <div style={{ fontSize: 12, color: C.green, marginBottom: 8 }}>📎 {pendingAnswerFile[q.id].name} ready to attach</div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <input type="file" accept="application/pdf,image/*" style={{ display: "none" }} id={`file-${q.id}`}
                          onChange={(e) => handleAnswerFileSelect(e, q.id)} />
                        <button onClick={() => document.getElementById(`file-${q.id}`).click()} style={{ background: C.greenLight, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", color: C.green }}>📎 PDF</button>
                        <button onClick={() => submitAnswer(q.id)} style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Submit Answer</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEGACY */}
      {tab === "legacy" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
            <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 22 }}>NSCHE BUK Legacy</h2>
            <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Honouring those who led before us</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {legacy.map((exec, i) => {
              const isOpen = expandedExco === exec.year;
              return (
                <div key={i} style={{ ...s.card, overflow: "hidden" }}>
                  <div onClick={() => setExpandedExco(isOpen ? null : exec.year)}
                    style={{ background: `linear-gradient(135deg, ${LIGHT.greenDark}, ${LIGHT.green})`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>Executive Set {exec.year}</div>
                    <span style={{ color: "#fff", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {EXCO_POSITIONS.map((pos, j) => (
                          <div key={j} style={{ background: C.greenLight, borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 18, marginBottom: 3 }}>{pos.icon}</div>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{pos.role}</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: C.ink, marginTop: 2 }}>{exec[pos.key]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.navBg, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "8px 0 10px", boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, color: tab === n.id ? C.green : C.muted,
            fontWeight: tab === n.id ? 700 : 400, fontSize: 9, padding: "4px 8px"
          }}>
            <span style={{ fontSize: 19 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
