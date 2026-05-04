import { useState, useEffect, useRef } from "react";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";

const defaultChecklist = {
  wedding: [
    "Book the venue", "Choose catering", "Hire photographer",
    "Send invitations", "Book DJ or band", "Order wedding cake",
    "Arrange flowers", "Book accommodation for guests",
  ],
  birthday: [
    "Book venue", "Send invitations", "Order birthday cake",
    "Arrange catering", "Plan entertainment", "Buy decorations",
  ],
  corporate: [
    "Book conference venue", "Set up AV equipment", "Send invitations",
    "Arrange catering", "Prepare agenda", "Book keynote speaker",
  ],
  bar_mitzvah: [
    "Book synagogue", "Book reception venue", "Send invitations",
    "Arrange catering", "Hire DJ or band", "Order cake", "Book photographer",
  ],
};

const regionLabels = {
  tel_aviv: "Tel Aviv & Center",
  jerusalem: "Jerusalem & Surroundings",
  haifa: "Haifa & North",
  sharon: "Sharon & Hasharon",
  south: "South & Negev",
  eilat: "Eilat",
  nationwide: "Anywhere in Israel",
};

const s = {
  page: {
    minHeight: "100vh", background: "#0d0d0f",
    fontFamily: "'Georgia', serif", color: "#ffffff",
  },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  eventBadge: {
    fontSize: "12px", padding: "4px 12px", borderRadius: "20px",
    background: "rgba(139,92,246,0.2)", color: "#c084fc",
    border: "1px solid rgba(139,92,246,0.3)",
  },
  eventMeta: {
    display: "flex", gap: "16px", alignItems: "center",
  },
  metaChip: {
    fontSize: "12px", color: "rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.04)", borderRadius: "8px",
    padding: "4px 10px",
  },
  savingDot: (saving) => ({
    fontSize: "12px", color: saving ? "#fb923c" : "#4ade80",
    transition: "color 0.4s ease",
  }),
  body: { padding: "40px", maxWidth: "1100px", margin: "0 auto" },
  pageTitle: { fontSize: "28px", fontWeight: "700", margin: "0 0 4px" },
  pageSubtitle: { fontSize: "14px", color: "rgba(255,255,255,0.35)", margin: "0 0 36px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
  card: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px", padding: "28px",
  },
  cardTitle: {
    fontSize: "15px", fontWeight: "600", color: "rgba(255,255,255,0.7)",
    margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px",
  },
  budgetNumbers: { display: "flex", justifyContent: "space-between", marginBottom: "16px" },
  budgetItem: { textAlign: "center" },
  budgetValue: (color) => ({ fontSize: "26px", fontWeight: "700", color, display: "block" }),
  budgetLabel: { fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px" },
  progressBar: { height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "20px" },
  progressFill: (pct) => ({
    height: "100%", width: `${Math.min(pct, 100)}%`,
    background: pct > 90 ? "#f87171" : pct > 70 ? "#fb923c" : "#4ade80",
    borderRadius: "3px", transition: "width 0.5s ease",
  }),
  inputRow: { display: "flex", gap: "8px", marginBottom: "8px" },
  input: {
    flex: 1, padding: "10px 14px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "#ffffff", fontSize: "14px",
    fontFamily: "'Georgia', serif", outline: "none",
  },
  addBtn: (color) => ({
    padding: "10px 18px", background: color || "rgba(139,92,246,0.3)",
    border: "none", borderRadius: "10px", color: "#ffffff",
    fontSize: "14px", cursor: "pointer", fontFamily: "'Georgia', serif", whiteSpace: "nowrap",
  }),
  iconBtn: {
    background: "none", border: "none", color: "rgba(255,255,255,0.25)",
    cursor: "pointer", fontSize: "18px", padding: "0", lineHeight: 1,
  },
  expenseItem: { background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" },
  expenseTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" },
  expenseName: { fontSize: "14px", fontWeight: "600", color: "#ffffff" },
  expenseAmount: { fontSize: "14px", color: "#f87171", fontWeight: "600" },
  expenseActions: { display: "flex", gap: "8px", alignItems: "center" },
  commentInput: {
    width: "100%", padding: "7px 10px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "8px", color: "rgba(255,255,255,0.6)", fontSize: "12px",
    fontFamily: "'Georgia', serif", outline: "none", boxSizing: "border-box", marginTop: "6px",
  },
  list: { listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: "8px" },
  listItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", fontSize: "14px",
  },
  listItemLeft: { display: "flex", alignItems: "center", gap: "10px" },
  emptyMsg: { fontSize: "13px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "20px 0", margin: 0 },
  checklistItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: "10px",
    fontSize: "14px", cursor: "pointer", marginBottom: "8px",
  },
  checkbox: (checked) => ({
    width: "18px", height: "18px", borderRadius: "5px",
    border: `2px solid ${checked ? "#4ade80" : "rgba(255,255,255,0.2)"}`,
    background: checked ? "#4ade80" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.2s ease",
  }),
  checkedText: (checked) => ({
    textDecoration: checked ? "line-through" : "none",
    color: checked ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
    flex: 1,
  }),
  popupOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(4px)",
  },
  popup: {
    background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "420px",
    fontFamily: "'Georgia', serif",
  },
  popupTitle: { fontSize: "18px", fontWeight: "600", color: "#ffffff", margin: "0 0 24px" },
  popupField: { marginBottom: "14px" },
  popupLabel: {
    display: "block", fontSize: "11px", color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "6px",
  },
  popupInput: {
    width: "100%", padding: "10px 14px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "#ffffff", fontSize: "14px",
    fontFamily: "'Georgia', serif", outline: "none", boxSizing: "border-box",
  },
  popupActions: { display: "flex", gap: "10px", marginTop: "24px" },
  popupSave: {
    flex: 1, padding: "12px", background: "rgba(139,92,246,0.5)", border: "none",
    borderRadius: "10px", color: "#ffffff", fontSize: "14px",
    cursor: "pointer", fontFamily: "'Georgia', serif",
  },
  popupCancel: {
    flex: 1, padding: "12px", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
    color: "rgba(255,255,255,0.5)", fontSize: "14px", cursor: "pointer", fontFamily: "'Georgia', serif",
  },
  detailChip: {
    fontSize: "11px", color: "rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "2px 8px",
    marginTop: "2px", display: "inline-block",
  },
  checklistAddRow: { display: "flex", gap: "8px", marginTop: "12px" },

  // ── AI Panel ──
  aiSection: {
    maxWidth: "1100px", margin: "0 auto", padding: "0 40px 40px",
  },
  aiCard: {
    background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(192,132,252,0.04))",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: "24px", overflow: "hidden",
  },
  aiHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 28px", borderBottom: "1px solid rgba(139,92,246,0.1)",
    cursor: "pointer",
  },
  aiHeaderLeft: { display: "flex", alignItems: "center", gap: "12px" },
  aiAvatar: {
    width: "40px", height: "40px", borderRadius: "12px",
    background: "linear-gradient(135deg, #7c3aed, #c084fc)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "20px", flexShrink: 0,
  },
  aiName: { fontSize: "15px", fontWeight: "600", color: "#ffffff", margin: "0 0 2px" },
  aiTagline: { fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 },
  aiToggle: { fontSize: "20px", color: "rgba(255,255,255,0.3)" },
  aiBody: {
    padding: "0 28px 28px",
  },
  chatMessages: {
    maxHeight: "380px", overflowY: "auto", paddingTop: "20px",
    display: "flex", flexDirection: "column", gap: "14px",
    scrollbarWidth: "none",
  },
  msgAI: {
    display: "flex", gap: "10px", alignItems: "flex-start",
  },
  msgAIBubble: {
    background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: "16px 16px 16px 4px", padding: "12px 16px",
    fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: "1.6",
    maxWidth: "80%",
  },
  msgAIAvatar: {
    width: "28px", height: "28px", borderRadius: "8px",
    background: "linear-gradient(135deg, #7c3aed, #c084fc)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px", flexShrink: 0, marginTop: "2px",
  },
  msgUser: {
    display: "flex", justifyContent: "flex-end",
  },
  msgUserBubble: {
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px 16px 4px 16px", padding: "12px 16px",
    fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: "1.6",
    maxWidth: "80%",
  },
  typingDots: {
    display: "flex", gap: "4px", alignItems: "center", padding: "4px 0",
  },
  dot: (delay) => ({
    width: "6px", height: "6px", borderRadius: "50%",
    background: "#c084fc", opacity: 0.6,
    animation: `bounce 1.2s ${delay}s infinite`,
  }),
  chatInputRow: {
    display: "flex", gap: "10px", marginTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px",
  },
  chatInput: {
    flex: 1, padding: "12px 16px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px", color: "#ffffff", fontSize: "14px",
    fontFamily: "'Georgia', serif", outline: "none", resize: "none",
  },
  chatSendBtn: {
    padding: "12px 20px", background: "linear-gradient(135deg, #7c3aed, #9f4ff7)",
    border: "none", borderRadius: "12px", color: "#ffffff",
    fontSize: "14px", cursor: "pointer", fontFamily: "'Georgia', serif",
    whiteSpace: "nowrap", alignSelf: "flex-end",
  },
  suggestedQuestions: {
    display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px",
  },
  suggestBtn: {
    padding: "7px 14px", background: "rgba(139,92,246,0.1)",
    border: "1px solid rgba(139,92,246,0.2)", borderRadius: "20px",
    color: "#c084fc", fontSize: "12px", cursor: "pointer",
    fontFamily: "'Georgia', serif", transition: "all 0.2s ease",
  },
};

// ── Contact Popup ─────────────────────────────────────────────────────────────
function ContactPopup({ type, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: "", email: "", phone: "", note: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fields = type === "provider"
    ? [
        { key: "name", label: "Provider Name", placeholder: "e.g. Dan's Catering" },
        { key: "serviceType", label: "Service Type", placeholder: "e.g. Venue, DJ, Catering" },
        { key: "phone", label: "Phone", placeholder: "+972 50 000 0000" },
        { key: "email", label: "Email", placeholder: "contact@provider.com" },
        { key: "note", label: "Note", placeholder: "Any extra info…" },
      ]
    : [
        { key: "name", label: "Full Name", placeholder: "e.g. Sarah Cohen" },
        { key: "phone", label: "Phone", placeholder: "+972 50 000 0000" },
        { key: "email", label: "Email", placeholder: "guest@email.com" },
        { key: "note", label: "Note", placeholder: "Dietary restrictions, +1, etc." },
      ];

  return (
    <div style={s.popupOverlay} onClick={onClose}>
      <div style={s.popup} onClick={(e) => e.stopPropagation()}>
        <p style={s.popupTitle}>
          {initial ? "✏️ Edit" : "➕ Add"} {type === "provider" ? "Provider" : "Guest"}
        </p>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} style={s.popupField}>
            <label style={s.popupLabel}>{label}</label>
            <input style={s.popupInput} placeholder={placeholder}
              value={form[key] || ""} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}
        <div style={s.popupActions}>
          <button style={s.popupSave} onClick={() => form.name.trim() && onSave(form)}>Save</button>
          <button style={s.popupCancel} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── AI Producer Panel ─────────────────────────────────────────────────────────
function AIProducer({ event, budget, expenses, guests, providers, checklist }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const remaining = budget.total - totalSpent;
  const spentPct = budget.total > 0 ? Math.round((totalSpent / budget.total) * 100) : 0;
  const doneCount = (checklist || []).filter((i) => i.done).length;

  const buildContext = () => {
  const today = new Date();
  const eventDate = event.date ? new Date(event.date) : null;
  const daysUntilEvent = eventDate 
    ? Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24)) 
    : null;

  return `
You are a warm, smart, proactive Israeli event planning assistant called the "Digital Producer" for MefeeKali — a platform built for the Israeli event market.

TODAY'S DATE: ${today.toLocaleDateString('en-IL', { year: 'numeric', month: 'long', day: 'numeric' })}
DAYS UNTIL EVENT: ${daysUntilEvent !== null ? `${daysUntilEvent} days` : "event date not set yet"}

CURRENT EVENT CONTEXT:
- Event type: ${event.type}
- Event name: ${event.title}
- Date: ${event.date || "not set yet"}
- Region: ${event.region ? regionLabels[event.region] : "not set yet"}
- Guest count: ${event.guestCount || "not set yet"}
- Total budget: ${budget.total > 0 ? `₪${budget.total.toLocaleString()}` : "NOT SET YET"}
- Amount spent: ₪${totalSpent.toLocaleString()}
- Remaining budget: ₪${remaining.toLocaleString()}
- Budget used: ${budget.total > 0 ? `${spentPct}%` : "N/A"}
- Expenses logged: ${expenses.map(e => `${e.name} (₪${e.amount})`).join(", ") || "none"}
- Providers booked: ${providers.map(p => `${p.name} (${p.serviceType || p.type || "general"})`).join(", ") || "none"}
- Checklist: ${doneCount}/${(checklist || []).length} items done
- Guests added: ${guests.length}

RULES YOU MUST FOLLOW:
1. If budget is NOT SET, do not recommend vendors or give cost estimates. Instead ask them to set a budget first.
2. Always be aware of remaining budget — never recommend something that would exceed it without flagging it.
3. If guest count is not set, ask for it when relevant (e.g. catering, venue capacity).
4. If region is not set, ask where they want the event before recommending local vendors.
5. Be proactive — notice gaps. If no venue is booked, mention it. If the event is soon and checklist is low, flag it.
6. Be warm, encouraging, and conversational. You know the Israeli event market well.
7. Prices should always be in Israeli Shekels (₪).
8. Keep responses concise and friendly — use short paragraphs, not walls of text.
9. When users ask about venues, vendors, or places — use web search to find REAL options in their region. Search in Hebrew or English for actual venues with names, locations and prices.
10. Always use TODAY'S DATE and DAYS UNTIL EVENT to give time-sensitive advice. Never assume a date.
11. Always format responses with numbered lists or bullet points. Never write long paragraphs. Keep each point short and scannable.
`;
};
  const sendInitialGreeting = async () => {
    setLoading(true);
    try {
      const missingFields = [];
      if (!budget.total) missingFields.push("budget");
      if (!event.guestCount) missingFields.push("guest count");
      if (!event.region) missingFields.push("preferred region");
      if (!event.date) missingFields.push("event date");

      const prompt = missingFields.length > 0
        ? `Give a warm 2-sentence greeting as the Digital Producer for a ${event.type} called "${event.title}". Then in a friendly way, mention that to give the best recommendations you still need: ${missingFields.join(", ")}. Ask for the first missing item only. Keep it short and warm.`
        : `Give a warm 2-sentence greeting as the Digital Producer for a ${event.type} called "${event.title}" with ${event.guestCount} guests, budget of ₪${budget.total.toLocaleString()}, on ${event.date} in ${regionLabels[event.region]}. Then give one proactive smart tip or observation about their planning. Keep it short.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version": "2023-06-01","anthropic-dangerous-direct-browser-access": "true",},
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: buildContext(),
            tools: [
    {
      type: "web_search_20250305",
      name: "web_search"
    }
  ],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content
  ?.filter(block => block.type === "text")
  ?.map(block => block.text)
  ?.join("\n") || "Hi! I'm your Digital Producer. How can I help?";
      setMessages([{ role: "ai", text }]);
    } catch {
      setMessages([{ role: "ai", text: "Hi! I'm your Digital Producer 🎬 I'm here to help you plan every detail. What would you like to work on?" }]);
    }
    setLoading(false);
  };

 const sendMessage = async (userText) => {
  if (!userText.trim() || loading) return;
  const newMessages = [...messages, { role: "user", text: userText }];
  setMessages(newMessages);
  setInput("");
  setLoading(true);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: buildContext(),
          tools: [
    {
      type: "web_search_20250305",
      name: "web_search"
    }
  ],
        messages: newMessages.map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        })),
      }),
    });
    const data = await res.json();
    const text = data.content
  ?.filter(block => block.type === "text")
  ?.map(block => block.text)
  ?.join("\n") || "Sorry, I had trouble with that. Try again?";
    setMessages((prev) => [...prev, { role: "ai", text }]);
  } catch (err) {
    console.error("sendMessage error:", err);
    setMessages((prev) => [...prev, { role: "ai", text: `Error: ${err.message}` }]);
  }
  setLoading(false);
};

  const suggested = budget.total === 0
    ? ["How do I set my budget?", "What should I plan first?", "How many guests is typical?"]
    : ["What vendors do I still need?", "Am I on track with my budget?", "Suggest a timeline for me"];

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }

        .ai-bubble p { margin: 0 0 8px; }
        .ai-bubble p:last-child { margin-bottom: 0; }
        .ai-bubble strong { color: #e2d9f3; font-weight: 700; }
        .ai-bubble h1 { color: #c084fc; font-size: 15px; font-weight: 700; margin: 10px 0 6px; }
        .ai-bubble h2, .ai-bubble h3 { color: #c084fc; font-size: 14px; margin: 10px 0 6px; }
        .ai-bubble ul, .ai-bubble ol { 
          margin: 6px 0; padding-left: 18px; 
        }
        .ai-bubble li { margin-bottom: 4px; }
        .ai-bubble hr { 
          border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0; 
        }
      `}</style>
      <div style={s.aiSection}>
        <div style={s.aiCard}>
          {/* Header */}
          <div style={s.aiHeader} onClick={() => setOpen((o) => !o)}>
            <div style={s.aiHeaderLeft}>
              <div style={s.aiAvatar}>🎬</div>
              <div>
                <p style={s.aiName}>Your Digital Producer</p>
                <p style={s.aiTagline}>AI-powered planning assistant · Powered by MefeeKali</p>
              </div>
            </div>
            <span style={s.aiToggle}>{open ? "▲" : "▼"}</span>
          </div>

          {/* Chat body */}
          {open && (
            <div style={s.aiBody}>
              <div style={s.chatMessages}>
              {messages.map((m, i) =>
                m.role === "ai" ? (
                  <div key={i} style={s.msgAI}>
                    <div style={s.msgAIAvatar}>🎬</div>
                    <div style={s.msgAIBubble} className="ai-bubble">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div key={i} style={s.msgUser}>
                    <div style={s.msgUserBubble}>{m.text}</div>
                  </div>
                )
              )}
                {loading && (
                  <div style={s.msgAI}>
                    <div style={s.msgAIAvatar}>🎬</div>
                    <div style={s.msgAIBubble}>
                      <div style={s.typingDots}>
                        <div style={s.dot(0)} />
                        <div style={s.dot(0.2)} />
                        <div style={s.dot(0.4)} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested questions */}
              <div style={s.suggestedQuestions}>
                {suggested.map((q, i) => (
                  <button key={i} style={s.suggestBtn} onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>

              {/* Input */}
              <div style={s.chatInputRow}>
                <textarea
                  style={s.chatInput}
                  rows={1}
                  placeholder="Ask your Digital Producer anything…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                />
                <button style={s.chatSendBtn} onClick={() => sendMessage(input)} disabled={loading}>
                  Send ✨
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function Dashboard({ user, event, googleToken }) {
  const docRef = doc(db, "events", event.id);

  const [loaded, setLoaded] = useState(false);
  const [budget, setBudget] = useState({ total: 0 });
  const [budgetInput, setBudgetInput] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [guests, setGuests] = useState([]);
  const [providers, setProviders] = useState([]);
  const [checklist, setChecklist] = useState(null);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [guestPopup, setGuestPopup] = useState(null);
  const [providerPopup, setProviderPopup] = useState(null);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef(null);
  const [calendarPopup, setCalendarPopup] = useState(null);
  const [calendarStatus, setCalendarStatus] = useState("");

  useEffect(() => {
    setLoaded(false);
    setBudget({ total: 0 });
    setExpenses([]);
    setGuests([]);
    setProviders([]);
    setChecklist(null);

    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.budget) setBudget(d.budget);
        if (d.expenses) setExpenses(d.expenses);
        if (d.guests) setGuests(d.guests);
        if (d.providers) setProviders(d.providers);
        if (d.checklist) {
          setChecklist(d.checklist);
        } else {
          setChecklist(
            (defaultChecklist[event.type] || defaultChecklist.birthday)
              .map((text) => ({ text, done: false }))
          );
        }
      } else {
        setChecklist(
          (defaultChecklist[event.type] || defaultChecklist.birthday)
            .map((text) => ({ text, done: false }))
        );
      }
      setLoaded(true);
    });
  }, [event.id]);

  const scheduleSave = (patch) => {
    setSaving(true);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try { await updateDoc(docRef, patch); }
      catch { await setDoc(docRef, patch, { merge: true }); }
      setSaving(false);
    }, 800);
  };

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const remaining = budget.total - totalSpent;
  const spentPct = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;
  const doneCount = (checklist || []).filter((i) => i.done).length;

  const handleSetBudget = () => {
    if (!budgetInput) return;
    const next = { total: Number(budgetInput) };
    setBudget(next); setBudgetInput("");
    scheduleSave({ budget: next });
  };

  const handleAddExpense = () => {
    if (!expenseName.trim() || !expenseAmount) return;
    const next = [...expenses, { id: Date.now(), name: expenseName.trim(), amount: Number(expenseAmount), comment: "" }];
    setExpenses(next); setExpenseName(""); setExpenseAmount("");
    scheduleSave({ expenses: next });
  };

  const handleRemoveExpense = (id) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next); scheduleSave({ expenses: next });
  };

  const handleExpenseComment = (id, comment) => {
    const next = expenses.map((e) => e.id === id ? { ...e, comment } : e);
    setExpenses(next); scheduleSave({ expenses: next });
  };

  const handleSaveGuest = (form) => {
    const next = guestPopup?.index !== undefined
      ? guests.map((g, i) => i === guestPopup.index ? { ...g, ...form } : g)
      : [...guests, { id: Date.now(), ...form }];
    setGuests(next); setGuestPopup(null); scheduleSave({ guests: next });
  };

  const handleRemoveGuest = (i) => {
    const next = guests.filter((_, j) => j !== i);
    setGuests(next); scheduleSave({ guests: next });
  };

  const handleSaveProvider = (form) => {
    const next = providerPopup?.index !== undefined
      ? providers.map((p, i) => i === providerPopup.index ? { ...p, ...form } : p)
      : [...providers, { id: Date.now(), ...form }];
    setProviders(next); setProviderPopup(null); scheduleSave({ providers: next });
  };

  const handleRemoveProvider = (i) => {
    const next = providers.filter((_, j) => j !== i);
    setProviders(next); scheduleSave({ providers: next });
  };

  const toggleChecklistItem = (index) => {
    const next = (checklist || []).map((item, i) => i === index ? { ...item, done: !item.done } : item);
    setChecklist(next); scheduleSave({ checklist: next });
  };

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const next = [...(checklist || []), { text: newCheckItem.trim(), done: false }];
    setChecklist(next); setNewCheckItem(""); scheduleSave({ checklist: next });
  };

  const handleRemoveCheckItem = (index) => {
    const next = (checklist || []).filter((_, i) => i !== index);
    setChecklist(next); scheduleSave({ checklist: next });
  };
const addToCalendar = async (title, date, description = "", time = "10:00") => {
  if (!googleToken) {
    setCalendarStatus("⚠️ Please sign in with Google to use Calendar.");
    setTimeout(() => setCalendarStatus(""), 3000);
    return;
  }
  try {
    const startDate = date || event.date;
    if (!startDate) { setCalendarPopup({ title, description, time }); return; }
    const startDateTime = new Date(`${startDate}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { "Authorization": `Bearer ${googleToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: startDateTime.toISOString(), timeZone: "Asia/Jerusalem" },
        end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Jerusalem" },
      }),
    });
    const responseData = await res.json();
    console.log("Calendar API response:", responseData);
    setCalendarStatus(res.ok ? `✅ "${title}" added to Google Calendar!` : `❌ ${responseData.error?.message || "Failed"}`);
    setTimeout(() => setCalendarStatus(""), 4000);
  } catch (err) {
    console.error("Calendar error:", err);
    setCalendarStatus("❌ Something went wrong.");
    setTimeout(() => setCalendarStatus(""), 3000);
  }
};s
  if (!loaded) {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {guestPopup !== null && (
        <ContactPopup type="guest" initial={guestPopup?.data}
          onSave={handleSaveGuest} onClose={() => setGuestPopup(null)} />
      )}
      {providerPopup !== null && (
        <ContactPopup type="provider" initial={providerPopup?.data}
          onSave={handleSaveProvider} onClose={() => setProviderPopup(null)} />
      )}

            {calendarPopup !== null && (
        <div style={s.popupOverlay} onClick={() => setCalendarPopup(null)}>
          <div style={s.popup} onClick={(e) => e.stopPropagation()}>
            <p style={s.popupTitle}>📅 Add to Google Calendar</p>
            <div style={s.popupField}>
              <label style={s.popupLabel}>Time</label>
              <input style={s.popupInput} type="time"
                value={calendarPopup.time || "10:00"}
                onChange={(e) => setCalendarPopup(p => ({ ...p, time: e.target.value }))} />
            </div>
            <div style={s.popupField}>
              <label style={s.popupLabel}>Title</label>
              <input style={s.popupInput} placeholder="e.g. Venue visit"
                value={calendarPopup.title}
                onChange={(e) => setCalendarPopup(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={s.popupField}>
              <label style={s.popupLabel}>Date</label>
              <input style={s.popupInput} type="date"
                value={calendarPopup.date || ""}
                onChange={(e) => setCalendarPopup(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div style={s.popupField}>
              <label style={s.popupLabel}>Description</label>
              <input style={s.popupInput} placeholder="Optional notes"
                value={calendarPopup.description}
                onChange={(e) => setCalendarPopup(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={s.popupActions}>
              <button style={s.popupSave} onClick={() => {
                addToCalendar(calendarPopup.title, calendarPopup.date, calendarPopup.description);
                setCalendarPopup(null);
              }}>Add to Calendar</button>
              <button style={s.popupCancel} onClick={() => setCalendarPopup(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.eventMeta}>
          <span style={s.eventBadge}>{event.title}</span>
          {event.date && <span style={s.metaChip}>📅 {event.date}</span>}
          {event.guestCount && <span style={s.metaChip}>👥 {event.guestCount} guests</span>}
          {event.region && <span style={s.metaChip}>📍 {regionLabels[event.region]}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {calendarStatus && <span style={{ fontSize: "12px", color: "#4ade80" }}>{calendarStatus}</span>}
          <button
            style={{ ...s.addBtn("rgba(56,189,248,0.2)"), fontSize: "12px", padding: "6px 14px", border: "1px solid rgba(56,189,248,0.3)" }}
            onClick={() => setCalendarPopup({ title: "", description: "" })}
          >📅 Add Meeting</button>
          <span style={s.savingDot(saving)}>{saving ? "● saving…" : "● saved"}</span>
        </div>
      </div>

      <div style={s.body}>
        <h2 style={s.pageTitle}>Event Dashboard</h2>
        <p style={s.pageSubtitle}>Manage everything for your {event.title} in one place</p>

        <div style={s.grid}>

          {/* BUDGET */}
          <div style={s.card}>
            <p style={s.cardTitle}>💰 Budget</p>
            <div style={s.budgetNumbers}>
              <div style={s.budgetItem}>
                <span style={s.budgetValue("#ffffff")}>₪{budget.total.toLocaleString()}</span>
                <span style={s.budgetLabel}>Total</span>
              </div>
              <div style={s.budgetItem}>
                <span style={s.budgetValue("#f87171")}>₪{totalSpent.toLocaleString()}</span>
                <span style={s.budgetLabel}>Spent</span>
              </div>
              <div style={s.budgetItem}>
                <span style={s.budgetValue("#4ade80")}>₪{remaining.toLocaleString()}</span>
                <span style={s.budgetLabel}>Remaining</span>
              </div>
            </div>
            <div style={s.progressBar}><div style={s.progressFill(spentPct)} /></div>
            <div style={s.inputRow}>
              <input style={s.input} type="number" placeholder="Set total budget (₪)"
                value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetBudget()} />
              <button style={s.addBtn("rgba(139,92,246,0.4)")} onClick={handleSetBudget}>Set</button>
            </div>
            <div style={s.inputRow}>
              <input style={s.input} type="text" placeholder="Expense name"
                value={expenseName} onChange={(e) => setExpenseName(e.target.value)} />
              <input style={{ ...s.input, maxWidth: "110px" }} type="number" placeholder="₪ Amount"
                value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddExpense()} />
              <button style={s.addBtn("rgba(248,113,113,0.4)")} onClick={handleAddExpense}>Add</button>
            </div>
            {expenses.length === 0 ? <p style={s.emptyMsg}>No expenses added yet</p> : (
              expenses.map((exp) => (
                <div key={exp.id} style={s.expenseItem}>
                  <div style={s.expenseTop}>
                    <span style={s.expenseName}>{exp.name}</span>
                    <div style={s.expenseActions}>
                      <span style={s.expenseAmount}>₪{exp.amount.toLocaleString()}</span>
                      <button style={s.iconBtn} onClick={() => handleRemoveExpense(exp.id)}>×</button>
                    </div>
                  </div>
                  <input style={s.commentInput} type="text" placeholder="Add a comment…"
                    value={exp.comment || ""}
                    onChange={(e) => handleExpenseComment(exp.id, e.target.value)} />
                </div>
              ))
            )}
          </div>

          {/* CHECKLIST */}
          <div style={s.card}>
            <p style={s.cardTitle}>
              ✅ Checklist
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                {doneCount}/{checklist.length} done
              </span>
            </p>
            {checklist.map((item, i) => (
              <div key={i} style={s.checklistItem}>
                <div style={s.checkbox(item.done)} onClick={() => toggleChecklistItem(i)}>
                  {item.done && <span style={{ color: "#000", fontSize: "11px", fontWeight: "700" }}>✓</span>}
                </div>
                <span style={s.checkedText(item.done)} onClick={() => toggleChecklistItem(i)}>{item.text}</span>
                <button style={{ ...s.iconBtn, fontSize: "12px", opacity: 0.5 }}
                  onClick={() => addToCalendar(item.text, event.date, `Checklist: ${item.text}`)}>📅</button>
                <button style={{ ...s.iconBtn, fontSize: "14px", marginLeft: "4px", opacity: 0.4 }}
                  onClick={() => handleRemoveCheckItem(i)}>×</button>
              </div>
            ))}
            <div style={s.checklistAddRow}>
              <input style={{ ...s.input, fontSize: "13px" }} placeholder="Add a checklist item…"
                value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCheckItem()} />
              <button style={s.addBtn("rgba(74,222,128,0.25)")} onClick={handleAddCheckItem}>＋</button>
            </div>
          </div>

          {/* GUESTS */}
          <div style={s.card}>
            <p style={s.cardTitle}>
              👥 Guest List
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                {guests.length} guests
              </span>
            </p>
            <button style={{ ...s.addBtn("rgba(139,92,246,0.3)"), width: "100%", marginBottom: "12px" }}
              onClick={() => setGuestPopup("new")}>＋ Add Guest</button>
            {guests.length === 0 ? <p style={s.emptyMsg}>No guests added yet</p> : (
              <ul style={s.list}>
                {guests.map((g, i) => (
                  <li key={g.id || i} style={s.listItem}>
                    <div style={s.listItemLeft}>
                      <span>👤</span>
                      <div>
                        <div style={{ fontWeight: "500" }}>{g.name}</div>
                        {(g.phone || g.email) && (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "3px" }}>
                            {g.phone && <span style={s.detailChip}>📞 {g.phone}</span>}
                            {g.email && <span style={s.detailChip}>✉️ {g.email}</span>}
                          </div>
                        )}
                        {g.note && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px", fontStyle: "italic" }}>{g.note}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={{ ...s.iconBtn, fontSize: "14px" }}
                        onClick={() => setGuestPopup({ index: i, data: g })}>✏️</button>
                      <button style={s.iconBtn} onClick={() => handleRemoveGuest(i)}>×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* PROVIDERS */}
          <div style={s.card}>
            <p style={s.cardTitle}>
              🏢 Providers
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                {providers.length} added
              </span>
            </p>
            <button style={{ ...s.addBtn("rgba(56,189,248,0.3)"), width: "100%", marginBottom: "12px" }}
              onClick={() => setProviderPopup("new")}>＋ Add Provider</button>
            {providers.length === 0 ? <p style={s.emptyMsg}>No providers added yet</p> : (
              <ul style={s.list}>
                {providers.map((p, i) => (
                  <li key={p.id || i} style={s.listItem}>
                    <div style={s.listItemLeft}>
                      <span>🏢</span>
                      <div>
                        <div style={{ fontWeight: "500" }}>{p.name}</div>
                        {p.serviceType && <span style={{ ...s.detailChip, color: "#38bdf8" }}>{p.serviceType}</span>}
                        {(p.phone || p.email) && (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "3px" }}>
                            {p.phone && <span style={s.detailChip}>📞 {p.phone}</span>}
                            {p.email && <span style={s.detailChip}>✉️ {p.email}</span>}
                          </div>
                        )}
                        {p.note && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px", fontStyle: "italic" }}>{p.note}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={{ ...s.iconBtn, fontSize: "14px" }}
                        onClick={() => setProviderPopup({ index: i, data: p })}>✏️</button>
                      <button style={s.iconBtn} onClick={() => handleRemoveProvider(i)}>×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* AI PRODUCER */}
      <AIProducer
        event={event}
        budget={budget}
        expenses={expenses}
        guests={guests}
        providers={providers}
        checklist={checklist || []}
      />
    </div>
  );
}

export default Dashboard;