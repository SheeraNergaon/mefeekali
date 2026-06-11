// The main event management screen. Renders after a user selects an event
// Contains 4 cards: Budget, Checklist, Guests, Providers
// Also renders the AI Producer chat panel at the bottom
// All data is loaded from and saved to Firestore in real time

import { useState, useEffect, useRef } from "react";
import { translations } from "../translations";
import { db } from "../firebase/config";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import GuestTable from "./GuestTable";
import VisionBoard from "./VisionBoard";
import BudgetTable from "./BudgetTable";

// Default checklist items per event type
// Keys match the event type IDs from EventPicker
const defaultChecklist = {
  wedding: [
    "הזמינו את האולם", "בחרו קייטרינג", "שכרו צלם",
    "שלחו הזמנות", "הזמינו דיג'י או להקה", "הזמינו עוגת חתונה",
    "סדרו פרחים", "הזמינו לינה לאורחים",
  ],
  birthday: [
    "הזמינו מקום", "שלחו הזמנות", "הזמינו עוגת יום הולדת",
    "סדרו קייטרינג", "תכננו בידור", "קנו קישוטים",
  ],
  corporate: [
    "הזמינו אולם כנסים", "הכינו ציוד AV", "שלחו הזמנות",
    "סדרו קייטרינג", "הכינו אג'נדה", "הזמינו נואם מרכזי",
  ],
  bar_mitzvah: [
    "הזמינו בית כנסת", "הזמינו אולם קבלה", "שלחו הזמנות",
    "סדרו קייטרינג", "שכרו דיג'י או להקה", "הזמינו עוגה", "שכרו צלם",
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

// All inline styles for the Dashboard component.
// Some are plain objects, some are functions that accept dynamic values
const s = {
  page: {
    minHeight: "100vh", background: "#FAF7F2", 
    fontFamily: "'Heebo', sans-serif", color: "#3d2c2c",
  },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  eventBadge: {
    fontSize: "12px", padding: "4px 12px", borderRadius: "20px",
    background: "rgba(139,92,246,0.2)", color: "#8B5A8B",
    border: "1px solid rgba(139,92,246,0.3)",
  },
  eventMeta: {
    display: "flex", gap: "16px", alignItems: "center",
  },
  metaChip: {
    fontSize: "12px", color: "#A89080",
    background: "transparent",
    borderRadius: "8px",
    padding: "4px 10px",
    border: "none",
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
    background: "#FDF9F5", border: "1px solid #E8DDD5",
    borderRadius: "20px", padding: "28px",
  },
  cardTitle: {
    fontSize: "15px", fontWeight: "600", color: "#4A3030",
    margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px",
  },
  budgetNumbers: { display: "flex", justifyContent: "space-between", marginBottom: "16px" },
  budgetItem: { textAlign: "center" },
  budgetValue: (color) => ({ fontSize: "26px", fontWeight: "700", color, display: "block" }),
  budgetLabel: { fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.8px" },
  progressBar: { height: "6px", background: "#E8DDD5", borderRadius: "3px", overflow: "hidden", marginBottom: "20px" },
  progressFill: (pct) => ({
    height: "100%", width: `${Math.min(pct, 100)}%`,
    background: pct > 90 ? "#f87171" : pct > 70 ? "#fb923c" : "#4ade80",
    borderRadius: "3px", transition: "width 0.5s ease",
  }),
  inputRow: { display: "flex", gap: "8px", marginBottom: "8px" },
  input: {
    flex: 1, padding: "10px 14px",
    background: "rgba(193,123,123,0.08)", border: "1px solid #E8DDD5",
    borderRadius: "10px", color: "#3d2c2c", fontSize: "14px",
    fontFamily: "'Heebo', sans-serif", outline: "none",
  },
  addBtn: (color) => ({
    padding: "10px 18px", background: color || "rgba(139,92,246,0.3)",
    border: "none", borderRadius: "10px", color: "#3d2c2c",
    fontSize: "14px", cursor: "pointer", fontFamily: "'Heebo', sans-serif", whiteSpace: "nowrap",
  }),
  iconBtn: {
    background: "none", border: "none", color: "#6B5B5B",
    cursor: "pointer", fontSize: "18px", padding: "0", lineHeight: 1,
  },
  expenseItem: { background: "#F5EDE8", borderRadius: "12px", padding: "12px 14px", marginBottom: "8px" },
  expenseTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" },
  expenseName: { fontSize: "14px", fontWeight: "600", color: "#3d2c2c" },
  expenseAmount: { fontSize: "14px", color: "#f87171", fontWeight: "600" },
  expenseActions: { display: "flex", gap: "8px", alignItems: "center" },
  commentInput: {
    width: "100%", padding: "7px 10px",
    background: "#F5EDE8", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "8px", color: "#5A4040", fontSize: "12px",
    fontFamily: "'Heebo', sans-serif", outline: "none", boxSizing: "border-box", marginTop: "6px",
  },
  list: { listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: "8px" },
  listItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", background: "#F5EDE8", borderRadius: "10px", fontSize: "14px",
  },
  listItemLeft: { display: "flex", alignItems: "center", gap: "10px" },
  emptyMsg: { fontSize: "13px", color: "#C4B0A8", textAlign: "center", padding: "20px 0", margin: 0 },
  checklistItem: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 14px", background: "#F5EDE8", borderRadius: "10px",
    fontSize: "14px", cursor: "pointer", marginBottom: "8px",
  },
  checkbox: (checked) => ({
    width: "18px", height: "18px", borderRadius: "5px",
    border: `2px solid ${checked ? "#4ade80" : "#C4B0A8"}`,
    background: checked ? "#4ade80" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "all 0.2s ease",
  }),
  checkedText: (checked) => ({
    textDecoration: checked ? "line-through" : "none",
    color: checked ? "#A89080" : "#3d2c2c",
    flex: 1,
  }),
  popupOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(4px)",
  },
  popup: {
    background: "#FDF9F5", border: "1px solid rgba(193,123,123,0.12)",
    borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "420px",
    fontFamily: "'Heebo', sans-serif",
    maxHeight: "90vh", overflowY: "auto",
  },  
  popupTitle: { fontSize: "18px", fontWeight: "600", color: "#3d2c2c", margin: "0 0 24px" },
  popupField: { marginBottom: "14px" },
  popupLabel: {
    display: "block", fontSize: "11px", color: "#8B7060",
    letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "6px",
  },
  popupInput: {
    width: "100%", padding: "10px 14px",
    background: "rgba(255,255,255,0.06)", border: "1px solid #E8DDD5",
    borderRadius: "10px", color: "#3d2c2c", fontSize: "14px",
    fontFamily: "'Heebo', sans-serif", outline: "none", boxSizing: "border-box",
  },
  popupActions: { display: "flex", gap: "10px", marginTop: "24px" },
  popupSave: {
    flex: 1, padding: "12px", background: "rgba(139,92,246,0.5)", border: "none",
    borderRadius: "10px", color: "#3d2c2c", fontSize: "14px",
    cursor: "pointer", fontFamily: "'Heebo', sans-serif",
  },
  popupCancel: {
    flex: 1, padding: "12px", background: "rgba(255,255,255,0.06)",
    border: "1px solid #E8DDD5", borderRadius: "10px",
    color: "#7A6060", fontSize: "14px", cursor: "pointer", fontFamily: "'Heebo', sans-serif",
  },
  detailChip: {
    fontSize: "11px", color: "#8B7060",
    background: "rgba(193,123,123,0.08)", borderRadius: "6px", padding: "2px 8px",
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
    background: "linear-gradient(135deg, #7c3aed, #8B5A8B)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "20px", flexShrink: 0,
  },
  aiName: { fontSize: "15px", fontWeight: "600", color: "#3d2c2c", margin: "0 0 2px" },
  aiTagline: { fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 },
  aiToggle: { fontSize: "20px", color: "#A89080" },
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
    fontSize: "14px", color: "#3d2c2c", lineHeight: "1.6",
    maxWidth: "80%",
  },
  msgAIAvatar: {
    width: "28px", height: "28px", borderRadius: "8px",
    background: "linear-gradient(135deg, #7c3aed, #8B5A8B)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px", flexShrink: 0, marginTop: "2px",
  },
  msgUser: {
    display: "flex", justifyContent: "flex-end",
  },
  msgUserBubble: {
    background: "rgba(255,255,255,0.07)", border: "1px solid #E8DDD5",
    borderRadius: "16px 16px 4px 16px", padding: "12px 16px",
    fontSize: "14px", color: "#3d2c2c", lineHeight: "1.6",
    maxWidth: "80%",
  },
  typingDots: {
    display: "flex", gap: "4px", alignItems: "center", padding: "4px 0",
  },
  dot: (delay) => ({
    width: "6px", height: "6px", borderRadius: "50%",
    background: "#8B5A8B", opacity: 0.6,
    animation: `bounce 1.2s ${delay}s infinite`,
  }),
  chatInputRow: {
    display: "flex", gap: "10px", marginTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px",
  },
  chatInput: {
    flex: 1, padding: "12px 16px",
    background: "rgba(193,123,123,0.08)", border: "1px solid #E8DDD5",
    borderRadius: "12px", color: "#3d2c2c", fontSize: "14px",
    fontFamily: "'Heebo', sans-serif", outline: "none", resize: "none",
  },
  chatSendBtn: {
    padding: "12px 20px", background: "linear-gradient(135deg, #7c3aed, #9f4ff7)",
    border: "none", borderRadius: "12px", color: "#3d2c2c",
    fontSize: "14px", cursor: "pointer", fontFamily: "'Heebo', sans-serif",
    whiteSpace: "nowrap", alignSelf: "flex-end",
  },
  suggestedQuestions: {
    display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px",
  },
  suggestBtn: {
    padding: "7px 14px", background: "rgba(139,92,246,0.1)",
    border: "1px solid rgba(139,92,246,0.2)", borderRadius: "20px",
    color: "#8B5A8B", fontSize: "12px", cursor: "pointer",
    fontFamily: "'Heebo', sans-serif", transition: "all 0.2s ease",
  },
};


// ── Contact Popup ─────────────────────────────────────────────────────────────
// Reusable popup for adding or editing a guest or provider.
// The fields rendered depend on the `type` prop ("guest" or "provider")
function ContactPopup({ type, initial, onSave, onClose, language = "he", event }) {
  const tr = translations[language];
  const isRTL = language === "he";
  const [form, setForm] = useState(initial || { name: "", email: "", phone: "", note: "" });
  
  // Helper to update a single field in the form state without replacing the whole object
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Defines which input fields to render based on type
  const fields = type === "provider"
    ? [
        { key: "name", label: tr.providerName, placeholder: tr.providerNamePlaceholder },
        { key: "serviceType", label: tr.serviceType, placeholder: tr.serviceTypePlaceholder },
        { key: "phone", label: tr.phone, placeholder: tr.phonePlaceholder },
        { key: "email", label: tr.email, placeholder: tr.emailProviderPlaceholder },
        { key: "note", label: tr.note, placeholder: tr.noteProviderPlaceholder },
      ]
    : [
        { key: "name", label: tr.fullName, placeholder: tr.guestNamePlaceholder },
        { key: "phone", label: tr.phone, placeholder: tr.phonePlaceholder },
        { key: "note", label: tr.note, placeholder: tr.notePlaceholder },
      ];

  return (
    <div style={s.popupOverlay} onClick={onClose}>
      <div style={{ ...s.popup, direction: isRTL ? "rtl" : "ltr" }} onClick={(e) => e.stopPropagation()}>
        <p style={s.popupTitle}>
          {type === "provider"
            ? (initial ? tr.editProviderTitle : tr.addProviderTitle)
            : (initial ? tr.editGuestTitle : tr.addGuestTitle)}
        </p>

        {fields.map(({ key, label, placeholder }) => (
          <div key={key} style={s.popupField}>
            <label style={s.popupLabel}>{label}</label>
            <input style={s.popupInput} placeholder={placeholder}
              value={form[key] || ""} onChange={(e) => set(key, e.target.value)}
              dir={key === "phone" ? "ltr" : undefined} />
          </div>
        ))}

        {/* Guest-only fields — shown only when type === "guest" */}
        {type === "guest" && (
          <>
            {event?.type === "wedding" && (
              <div style={s.popupField}>
                <label style={s.popupLabel}>{tr.invitedBy}</label>
                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  {[
                    { value: "חתן", label: tr.groomLabel },
                    { value: "כלה", label: tr.brideLabel },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => set("invitedBy", value)}
                      style={{
                        flex: 1, padding: "10px", borderRadius: "10px", cursor: "pointer",
                        fontFamily: "'Heebo', sans-serif", fontSize: "14px",
                        background: form.invitedBy === value ? "rgba(139,92,246,0.3)" : "#F5EDE8",
                        border: `1px solid ${form.invitedBy === value ? "rgba(139,92,246,0.6)" : "#E8DDD5"}`,
                        color: form.invitedBy === value ? "#8B5A8B" : "#7A6060",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.howManyGuests}</label>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                {[1,2,3,4,5,6,7].map((n) => (
                  <button
                    key={n}
                    onClick={() => set("guestCount", n)}
                    style={{
                      width: "42px", height: "42px", borderRadius: "10px", cursor: "pointer",
                      fontFamily: "'Heebo', sans-serif", fontSize: "15px", fontWeight: "600",
                      background: form.guestCount === n ? "rgba(139,92,246,0.3)" : "#F5EDE8",
                      border: `1px solid ${form.guestCount === n ? "rgba(139,92,246,0.6)" : "#E8DDD5"}`,
                      color: form.guestCount === n ? "#8B5A8B" : "#7A6060",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Provider-only fields — shown only when type === "provider" */}
        {type === "provider" && (
          <>
            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.paymentStatusLabel}</label>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                {[
                  { key: "unpaid", label: tr.unpaid },
                  { key: "deposit", label: tr.deposit },
                  { key: "paid", label: tr.paid },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => set("paymentStatus", key)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "10px", cursor: "pointer",
                      fontFamily: "'Heebo', sans-serif", fontSize: "13px",
                      background: form.paymentStatus === key ? "rgba(139,92,246,0.3)" : "#F5EDE8",
                      border: `1px solid ${form.paymentStatus === key ? "rgba(139,92,246,0.6)" : "#E8DDD5"}`,
                      color: form.paymentStatus === key ? "#8B5A8B" : "#7A6060",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {form.paymentStatus === "deposit" && (
              <div style={s.popupField}>
                <label style={s.popupLabel}>{tr.depositAmountLabel}</label>
                <input
                  style={s.popupInput}
                  type="number"
                  placeholder="0"
                  value={form.depositAmount || ""}
                  onChange={(e) => set("depositAmount", Number(e.target.value))}
                />
              </div>
            )}

            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.totalPriceLabel}</label>
              <input
                style={s.popupInput}
                type="number"
                placeholder="0"
                value={form.totalPrice || ""}
                onChange={(e) => set("totalPrice", Number(e.target.value))}
              />
            </div>
          </>
        )}

        {/* Save and Cancel buttons */}
        <div style={s.popupActions}>
          <button style={s.popupSave} onClick={() => form.name.trim() && onSave(form)}>{tr.save}</button>
          <button style={s.popupCancel} onClick={onClose}>{tr.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ── AI Producer Panel ─────────────────────────────────────────────────────────
function AIProducer({ event, budget, expenses, guests, providers, checklist, language = "he" }) {
  const tr = translations[language];
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  // Summary stats passed into the AI context so it knows the current planning state
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
  9. When users ask about venues, vendors, or places — use web search to find REAL options in their region. Search in Hebrew or English for actual venues with names, locations and prices. Always search before giving price estimates — never guess prices from memory.
  10. For Israeli market prices always search first — prices change frequently. Never assume catering costs, venue prices, or vendor fees without searching.
  11. Always format responses with proper markdown — use - for bullet points, **bold** for emphasis. Never use • as bullet characters. Use proper line breaks between sections.
  12. IMPORTANT LANGUAGE RULE: Always respond in the SAME LANGUAGE the user writes in. If they write in Hebrew — respond in Hebrew. If they write in English — respond in English. Never switch languages mid-conversation.
  `;
  };

  // Sends an automatic opening message when the panel first loads.
  // If event details are missing (budget, date, etc.), Claude asks for them one at a time.
  // If all details exist, Claude gives a proactive planning tip instead
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
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: buildContext(),
          tools: [{ type: "web_search_20250305", name: "web_search" }],
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

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      sendInitialGreeting();
    }
  }, []);


  // Sends a user message to Claude API along with the full conversation history
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
          tools: [{ type: "web_search_20250305", name: "web_search" }],
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

  // Suggested questions shown as quick-tap buttons below the chat.
  // Shows beginner questions when budget is not set, advanced questions when it is
  const suggested = budget.total === 0
    ? [tr.suggestedQ1_nobudget, tr.suggestedQ2_nobudget, tr.suggestedQ3_nobudget]
    : [tr.suggestedQ1, tr.suggestedQ2, tr.suggestedQ3];


  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .ai-bubble p { margin: 0 0 8px; }
        .ai-bubble p:last-child { margin-bottom: 0; }
        .ai-bubble strong { color: #5A3A8B; font-weight: 700; }
        .ai-bubble h1 { color: #8B5A8B; font-size: 15px; font-weight: 700; margin: 10px 0 6px; }
        .ai-bubble h2, .ai-bubble h3 { color: #8B5A8B; font-size: 14px; margin: 10px 0 6px; }
        .ai-bubble ul, .ai-bubble ol { margin: 6px 0; padding-left: 18px; list-style: disc; }
        .ai-bubble ul li { display: list-item; margin-bottom: 6px; line-height: 1.6; }
        .ai-bubble ol li { display: list-item; margin-bottom: 6px; line-height: 1.6; }
        .ai-bubble hr { border: none; border-top: 1px solid #E8DDD5; margin: 10px 0; }
      `}</style>

      {/*AI Card*/}
      <div style={s.aiSection}>
        <div style={s.aiCard}>
          {/* Header — avatar, name, tagline, collapse toggle arrow */}
          <div style={s.aiHeader} onClick={() => setOpen((o) => !o)}>
            <div style={s.aiHeaderLeft}>
              <div style={s.aiAvatar}>🎬</div>
              <div>
                <p style={s.aiName}>Your Digital Producer</p>
                <p style={s.aiTagline}>{tr.aiTagline}</p>
              </div>
            </div>
            <span style={s.aiToggle}>{open ? "▲" : "▼"}</span>
          </div>

          {open && (
            <div style={s.aiBody}>

              {/* ── Messages List ── */}
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

                {/* Typing indicator — 3 animated dots shown while loading */}
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

              {/* Suggested question buttons — clicking sends message directly */}
              <div style={s.suggestedQuestions}>
                {suggested.map((q, i) => (
                  <button key={i} style={s.suggestBtn} onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>

              {/*Input Row*/}
              <div style={s.chatInputRow}>
                <textarea
                  style={s.chatInput}
                  rows={1}
                  placeholder={tr.chatPlaceholder}
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
                  {tr.send}
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
function Dashboard({ user, event, googleToken, language = "he" }) {
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
  const [guestFilter, setGuestFilter] = useState(null);
  const [showGuestTable, setShowGuestTable] = useState(false);
  const [showBudgetTable, setShowBudgetTable] = useState(false);
  const [showVisionBoard, setShowVisionBoard] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [showMeetingsPanel, setShowMeetingsPanel] = useState(false);
  const [expenseStatus, setExpenseStatus] = useState("unpaid");
  const [expenseDeposit, setExpenseDeposit] = useState("");
  const tr = translations[language];
  const isRTL = language === "he";

  // Loads all event data from Firestore when the selected event changes.
  // Resets all state first to prevent showing stale data from a previous event.
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
          if (d.guests) setGuests(d.guests);
          if (d.providers) setProviders(d.providers);
          if (d.meetings) setMeetings(d.meetings);

          const regularExpenses = (d.expenses || []).filter(e => !e.providerId);
          const providerExpenses = (d.providers || [])
            .filter(p => p.totalPrice > 0)
            .map(p => ({
              id: p.id,
              providerId: p.id,
              name: p.name,
              amount: p.totalPrice,
              comment: "",
            }));
          setExpenses([...regularExpenses, ...providerExpenses]);

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

  // Calculates total amount spent: regular expenses + all provider prices.
  // Provider expenses are read from the providers array (not from expenses)
  // to avoid double-counting
  const totalSpent = expenses.filter(e => !e.providerId).reduce((sum, e) => sum + (e.amount || 0), 0)
  + providers.reduce((sum, p) => sum + (p.totalPrice || 0), 0);

  const remaining = budget.total - totalSpent;
  const spentPct = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;
  const doneCount = (checklist || []).filter((i) => i.done).length;

  // Sets a new total budget and saves to Firestore
  const handleSetBudget = () => {
    if (!budgetInput) return;
    const next = { total: Number(budgetInput) };
    setBudget(next); setBudgetInput("");
    scheduleSave({ budget: next });
  };

  // Creates a new expense, saves only regular expenses to Firestore
  const handleAddExpense = () => {
    if (!expenseName.trim() || !expenseAmount) return;
    const newExpense = {
      id: Date.now(),
      name: expenseName.trim(),
      amount: Number(expenseAmount),
      comment: "",
      paymentStatus: expenseStatus,
      depositAmount: expenseStatus === "deposit" ? Number(expenseDeposit) : 0,
    };
    const next = [...expenses, newExpense];
    setExpenses(next); setExpenseName(""); setExpenseAmount("");
    setExpenseStatus("unpaid"); setExpenseDeposit("");
    const regularOnly = next.filter(e => !e.providerId);
    scheduleSave({ expenses: regularOnly });
  };

  // Removes an expense and saves only regular expenses to Firestore
  const handleRemoveExpense = (id) => {
    const next = expenses.filter((e) => e.id !== id);
    setExpenses(next);
    const regularOnly = next.filter(e => !e.providerId);
    scheduleSave({ expenses: regularOnly });
  };

  // Updates the comment of an expense and saves only regular expenses to Firestore
  const handleExpenseComment = (id, comment) => {
    const next = expenses.map((e) => e.id === id ? { ...e, comment } : e);
    setExpenses(next);
    const regularOnly = next.filter(e => !e.providerId);
    scheduleSave({ expenses: regularOnly });
  };

  // Adds a new guest or updates an existing one based on whether guestPopup.index is set.
  const handleSaveGuest = (form) => {
    const next = guestPopup?.index !== undefined
      ? guests.map((g, i) => i === guestPopup.index ? { ...g, ...form } : g)
      : [...guests, { id: Date.now(), ...form }];
    setGuests(next); setGuestPopup(null); scheduleSave({ guests: next });
  };

  // Removes a guest by index 
  const handleRemoveGuest = (i) => {
    const next = guests.filter((_, j) => j !== i);
    setGuests(next); scheduleSave({ guests: next });
  };

  // Updates specific fields on a guest
  const handleUpdateGuestField = (idOrIndex, fields) => {
    const next = guests.map((g, i) =>
      (g.id === idOrIndex || i === idOrIndex) ? { ...g, ...fields } : g
    );
    setGuests(next);
    scheduleSave({ guests: next });
  };

  // Saves a new provider or updates an existing one based on whether providerPopup.index is set.
  const handleSaveProvider = (form) => {
    const providerId = providerPopup?.index !== undefined
      ? providers[providerPopup.index]?.id || Date.now()
      : Date.now();

    const providerWithId = { ...form, id: providerId };

    const next = providerPopup?.index !== undefined
      ? providers.map((p, i) => i === providerPopup.index ? providerWithId : p)
      : [...providers, providerWithId];

    setProviders(next);
    setProviderPopup(null);

    if (providerWithId.totalPrice > 0) {
      const newExpense = {
        id: providerId,
        providerId: providerId,
        name: providerWithId.name,
        amount: providerWithId.totalPrice,
        comment: "",
      };
      const existingIndex = expenses.findIndex(e => e.providerId === providerId);
      const nextExpenses = existingIndex >= 0
        ? expenses.map(e => e.providerId === providerId ? newExpense : e)
        : [...expenses, newExpense];
      setExpenses(nextExpenses);
      scheduleSave({ providers: next, expenses: nextExpenses });
    } else {
      scheduleSave({ providers: next });
    }
  };

  // Removes a provider by index
  const handleRemoveProvider = (i) => {
    const next = providers.filter((_, j) => j !== i);
    setProviders(next); scheduleSave({ providers: next });
  };

  // Toggles a checklist item between done and not done
  const toggleChecklistItem = (index) => {
    const next = (checklist || []).map((item, i) => i === index ? { ...item, done: !item.done } : item);
    setChecklist(next); scheduleSave({ checklist: next });
  };

  // Adds a new checklist item with done: false
  const handleAddCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const next = [...(checklist || []), { text: newCheckItem.trim(), done: false }];
    setChecklist(next); setNewCheckItem(""); scheduleSave({ checklist: next });
  };

  // Removes a checklist item by index
  const handleRemoveCheckItem = (index) => {
    const next = (checklist || []).filter((_, i) => i !== index);
    setChecklist(next); scheduleSave({ checklist: next });
  };

  // Adds an event to Google Calendar via the Calendar API
  // Also supports custom reminders (popup notifications)
  const addToCalendar = async (title, date, description = "", time = "10:00") => {
    if (!googleToken) {
      setCalendarStatus(tr.signInGoogle);
      setTimeout(() => setCalendarStatus(""), 3000);
      return;
    }
    try {
      const startDate = date || event.date;
      if (!startDate) { setCalendarPopup({ title, description, time }); return; }
      const startDateTime = new Date(`${startDate}T${time}:00+03:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { "Authorization": `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title,
          description,
          start: { dateTime: startDateTime.toISOString(), timeZone: "Asia/Jerusalem" },
          end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Jerusalem" },
          reminders: calendarPopup?.reminder ? {
            useDefault: false,
            overrides: [{ method: "popup", minutes: calendarPopup.reminder }],
          } : { useDefault: true },
        }),
      });
      const responseData = await res.json();
      if (res.ok) {
        const newMeeting = {
          id: Date.now(),
          googleEventId: responseData.id,
          title,
          date: startDate,
          time,
          description,
        };
        const nextMeetings = [...meetings, newMeeting].sort((a, b) => 
          new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
        );
        setMeetings(nextMeetings);
        scheduleSave({ meetings: nextMeetings });
      }
      setCalendarStatus(res.ok ? `✅ "${title}" ${tr.calendarAdded}` : `❌ ${responseData.error?.message || "Failed"}`);
      setTimeout(() => setCalendarStatus(""), 4000);
    } catch (err) {
      console.error("Calendar error:", err);
      setCalendarStatus("❌ Something went wrong.");
      setTimeout(() => setCalendarStatus(""), 3000);
    }
  };

  if (!loaded) {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#A89080" }}>Loading…</p>
      </div>
    );
  }



  return (
    <div style={{ ...s.page, direction: isRTL ? "rtl" : "ltr" }}>
    {/* Full-screen Overlays*/}

      {/* GuestTable overlay*/}
      {showGuestTable && (
        <GuestTable
          guests={guests}
          language={language}
          onClose={() => setShowGuestTable(false)}
          onUpdateGuest={handleUpdateGuestField}
          onRemoveGuest={(idOrIndex) => {
            const next = guests.filter((g, i) => (g.id === idOrIndex || i === idOrIndex) ? false : true);
            setGuests(next);
            scheduleSave({ guests: next });
          }}
        />
      )}

      {/* BudgetTable overlay*/}
      {showBudgetTable && (
        <BudgetTable
          expenses={expenses}
          providers={providers}
          budget={budget}
          language={language}
          onClose={() => setShowBudgetTable(false)}
          onUpdateProvider={(id, fields) => {
            const nextProviders = providers.map(p => p.id === id ? { ...p, ...fields } : p);
            setProviders(nextProviders);
            const updatedProvider = nextProviders.find(p => p.id === id);
            const nextExpenses = expenses.map(e =>
              e.providerId === id
                ? { ...e, amount: updatedProvider?.totalPrice || e.amount }
                : e
            );
            setExpenses(nextExpenses);
            scheduleSave({ providers: nextProviders });
          }}
          onUpdateExpense={(id, fields) => {
            const next = expenses.map(e => e.id === id ? { ...e, ...fields } : e);
            setExpenses(next);
            const regularOnly = next.filter(e => !e.providerId);
            scheduleSave({ expenses: regularOnly });
          }}
        />
      )}
    {showVisionBoard && (
      <VisionBoard
        event={event}
        onClose={() => setShowVisionBoard(false)}
        language={language}
      />
    )}

      {/* ContactPopup for adding/editing a guest */}
      {guestPopup !== null && (
        <ContactPopup type="guest" initial={guestPopup?.data}
          onSave={handleSaveGuest} onClose={() => setGuestPopup(null)}
          language={language} event={event} />
      )}

      {/* ContactPopup for adding/editing a provider */}
      {providerPopup !== null && (
        <ContactPopup type="provider" initial={providerPopup?.data}
          onSave={handleSaveProvider} onClose={() => setProviderPopup(null)}
          language={language} />
      )}

      {/* Calendar popup*/}
      {calendarPopup !== null && (
        <div style={s.popupOverlay} onClick={() => setCalendarPopup(null)}>
          <div style={{ ...s.popup, direction: isRTL ? "rtl" : "ltr" }} onClick={(e) => e.stopPropagation()}>
            <p style={s.popupTitle}>{tr.calendarTitle}</p>
            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.titleLabel}</label>
              <input style={s.popupInput} placeholder={tr.titlePlaceholder}
                value={calendarPopup.title}
                onChange={(e) => setCalendarPopup(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.dateLabel}</label>
              <input style={s.popupInput} type="date"
                value={calendarPopup.date || ""}
                onChange={(e) => setCalendarPopup(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.timeLabel}</label>
              <input style={s.popupInput} type="time"
                value={calendarPopup.time || "10:00"}
                dir="ltr"
                onChange={(e) => setCalendarPopup(p => ({ ...p, time: e.target.value }))} />
            </div>
            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.descriptionLabel}</label>
              <input style={s.popupInput} placeholder={tr.descriptionPlaceholder}
                value={calendarPopup.description}
                onChange={(e) => setCalendarPopup(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={s.popupField}>
              <label style={s.popupLabel}>{tr.reminder}</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                {[
                  { value: 10, label: tr.reminder10 },
                  { value: 30, label: tr.reminder30 },
                  { value: 60, label: tr.reminder60 },
                  { value: 1440, label: tr.reminder1day },
                  { value: 10080, label: tr.reminder1week },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setCalendarPopup(p => ({ 
                      ...p, 
                      reminder: p.reminder === value ? null : value 
                    }))}
                    style={{
                      padding: "6px 12px", borderRadius: "10px", cursor: "pointer",
                      fontFamily: "'Heebo', sans-serif", fontSize: "13px",
                      background: calendarPopup.reminder === value ? "rgba(139,92,246,0.3)" : "#F5EDE8",
                      border: `1px solid ${calendarPopup.reminder === value ? "rgba(139,92,246,0.6)" : "#E8DDD5"}`,
                      color: calendarPopup.reminder === value ? "#8B5A8B" : "#7A6060",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.popupActions}>
              <button style={s.popupSave} onClick={() => {
                addToCalendar(calendarPopup.title, calendarPopup.date, calendarPopup.description, calendarPopup.time || "10:00");
                setCalendarPopup(null);
              }}>{tr.addToCalendarBtn}</button>
              <button style={s.popupCancel} onClick={() => setCalendarPopup(null)}>{tr.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={s.topBar}>
        {/* Event metadata — left side */}
        <div style={s.eventMeta}>
          <span style={s.eventBadge}>{event.title}</span>
          {event.date && <span style={s.metaChip}>📅 {event.date.split("-").reverse().join(".")}</span>}
          {event.guestCount && <span style={s.metaChip}>👥 {event.guestCount} {tr.guests}</span>}
          {event.region && <span style={s.metaChip}>📍 {regionLabels[event.region]}</span>}
        </div>

         {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {calendarStatus && <span style={{ fontSize: "12px", color: "#4ade80" }}>{calendarStatus}</span>}
          
          {/*Meetings Panel*/}
          <div style={{ position: "relative" }}>
          <button
            style={{ ...s.addBtn("rgba(56,189,248,0.2)"), fontSize: "12px", padding: "6px 14px", border: "1px solid rgba(56,189,248,0.3)", transition: "all 0.2s ease" }}
            onClick={() => setShowMeetingsPanel(o => !o)}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(56,189,248,0.35)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.6)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(56,189,248,0.2)";
              e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)";
            }}
          >
             📅 {tr.meetingsBtn} {meetings.length > 0 && `(${meetings.length})`}
            </button>

            {showMeetingsPanel && (
              <div style={{
                position: "absolute", top: "36px", left: 0,
                background: "#FDF9F5", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "16px", padding: "16px", width: "320px",
                zIndex: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                direction: isRTL ? "rtl" : "ltr",
              }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <button
                    onClick={() => { setCalendarPopup({ title: "", description: "", time: "10:00" }); setShowMeetingsPanel(false); }}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "10px", cursor: "pointer",
                      background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.3)",
                      color: "#38bdf8", fontSize: "13px", fontFamily: "'Heebo', sans-serif",
                    }}
                  >
                   ＋ {tr.addMeetingBtn}
                  </button>
                </div>

                {meetings.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#C4B0A8", fontSize: "13px", margin: "16px 0" }}>
                    {tr.noMeetings}
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                    {meetings.map((m) => {
                      const meetingDate = new Date(`${m.date}T${m.time}`);
                      const today = new Date();
                      const daysLeft = Math.ceil((meetingDate - today) / (1000 * 60 * 60 * 24));
                      const isPast = daysLeft < 0;
                      return (
                        <div key={m.id} style={{
                          background: "#F5EDE8", borderRadius: "10px", padding: "10px 12px",
                          borderRight: `3px solid ${isPast ? "#E8DDD5" : "#38bdf8"}`,
                          opacity: isPast ? 0.5 : 1,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#3d2c2c" }}>{m.title}</span>
                            <span style={{
                              fontSize: "11px", padding: "2px 8px", borderRadius: "10px",
                              background: isPast ? "rgba(193,123,123,0.08)" : "rgba(56,189,248,0.15)",
                              color: isPast ? "#A89080" : "#38bdf8",
                            }}>
                              {isPast
                                ? tr.meetingPast
                                : daysLeft === 0
                                ? tr.meetingToday
                                : `${daysLeft} ${tr.done}`}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#8B7060", marginTop: "4px" }}>
                            📅 {m.date} · ⏰ {m.time}
                          </div>
                          {m.description && <div style={{ fontSize: "11px", color: "#A89080", marginTop: "2px" }}>{m.description}</div>}
                          <button
                            onClick={async () => {
                              if (m.googleEventId && googleToken) {
                                await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${m.googleEventId}`, {
                                  method: "DELETE",
                                  headers: { "Authorization": `Bearer ${googleToken}` },
                                });
                              }
                              const next = meetings.filter(mt => mt.id !== m.id);
                              setMeetings(next);
                              scheduleSave({ meetings: next });
                            }}
                            style={{ background: "none", border: "none", color: "#C4B0A8", cursor: "pointer", fontSize: "12px", marginTop: "4px" }}
                          >
                            {tr.deleteMeeting}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
            <button
              style={{
                ...s.addBtn("rgba(236,182,210,0.2)"),
                fontSize: "12px", padding: "6px 14px",
                border: "1px solid rgba(200,140,180,0.3)",
                color: "#a0507a",
                transition: "all 0.2s ease",
              }}
              onClick={() => setShowVisionBoard(true)}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(236,182,210,0.5)";
                e.currentTarget.style.borderColor = "rgba(200,140,180,0.6)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(236,182,210,0.2)";
                e.currentTarget.style.borderColor = "rgba(200,140,180,0.3)";
              }}
            >
              🎨 Vision Board
            </button>
          <span style={s.savingDot(saving)}>{saving ? tr.saving : tr.saved}</span>
        </div>
      </div>

      {/* ── Dashboard Body ── */}
      <div style={s.body}>
        <h2 style={s.pageTitle}>{tr.eventDashboard}</h2>
        <p style={s.pageSubtitle}>{tr.manageEverything} {event.title} {tr.inOnePlace}</p>

        <div style={s.grid}>

          {/* BUDGET CARD */}
          <div style={s.card}>
            <p style={{ ...s.cardTitle, cursor: "pointer" }} onClick={() => setShowBudgetTable(true)}>
              💰 {tr.budget} <span style={{ fontSize: "13px", color: "#7A6060", marginRight: "8px" }}>← {tr.fullDetails}</span>
            </p>
            <div style={s.inputRow}>
              <input style={s.input} type="number" placeholder={tr.setBudget}
                value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetBudget()} />
              <button style={s.addBtn("rgba(139,92,246,0.4)")} onClick={handleSetBudget}>{tr.set}</button>
            </div>
            <div style={s.budgetNumbers}>
              <div style={s.budgetItem}>
                <span style={s.budgetValue("#3d2c2c")}>₪{budget.total.toLocaleString()}</span>
                <span style={s.budgetLabel}>{tr.total}</span>
              </div>
              <div style={s.budgetItem}>
                <span style={s.budgetValue("#f87171")}>₪{totalSpent.toLocaleString()}</span>
                <span style={s.budgetLabel}>{tr.spent}</span>
              </div>
              <div style={s.budgetItem}>
                <span style={s.budgetValue("#4ade80")}>₪{remaining.toLocaleString()}</span>
                <span style={s.budgetLabel}>{tr.remaining}</span>
              </div>
            </div>
            <div style={s.progressBar}><div style={s.progressFill(spentPct)} /></div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              {[
                { key: "unpaid", label: tr.unpaid },
                { key: "deposit", label: tr.deposit },
                { key: "paid", label: tr.paid },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setExpenseStatus(key)} style={{
                  flex: 1, padding: "8px", borderRadius: "10px", cursor: "pointer",
                  fontFamily: "'Heebo', sans-serif", fontSize: "13px",
                  background: expenseStatus === key 
                    ? key === "paid" ? "rgba(90,158,111,0.2)" 
                    : key === "deposit" ? "rgba(251,146,60,0.2)" 
                    : "rgba(248,113,113,0.2)"
                    : "#F5EDE8",
                  border: `1px solid ${expenseStatus === key 
                    ? key === "paid" ? "#5A9E6F" 
                    : key === "deposit" ? "#fb923c" 
                    : "#f87171"
                    : "#E8DDD5"}`,
                  color: expenseStatus === key 
                    ? key === "paid" ? "#5A9E6F" 
                    : key === "deposit" ? "#fb923c" 
                    : "#f87171"
                    : "#7A6060",
                }}>{label}</button>
              ))}
            </div>
            {expenseStatus === "deposit" && (
              <div style={{ ...s.inputRow }}>
                <input style={s.input} type="number"
                  placeholder={tr.depositAmountPlaceholder}
                  value={expenseDeposit}
                  onChange={(e) => setExpenseDeposit(e.target.value)} />
              </div>
            )}
            <div style={s.inputRow}>
              <input style={s.input} type="text" placeholder={tr.expenseName}
                value={expenseName} onChange={(e) => setExpenseName(e.target.value)} />
              <input style={{ ...s.input, maxWidth: "110px" }} type="number" placeholder={tr.amount}
                value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddExpense()} />
              <button style={s.addBtn("rgba(248,113,113,0.4)")} onClick={handleAddExpense}>{tr.add}</button>
            </div>
            {expenses.filter(e => !e.providerId).length === 0 && providers.length === 0 
              ? <p style={s.emptyMsg}>{tr.noExpenses}</p> 
              : null}

            {/* Provider Expenses */}
            {providers.filter(p => p.totalPrice > 0).map((p, i) => (
              <div key={p.id || i} style={{ ...s.expenseItem, borderLeft: "2px solid #38bdf8" }}>
                <div style={s.expenseTop}>
                  <span style={s.expenseName}>{p.name} {p.serviceType ? `· ${p.serviceType}` : ""}</span>
                  <span style={s.expenseAmount}>₪{p.totalPrice.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: "13px", color: p.paymentStatus === "paid" ? "#4ade80" : p.paymentStatus === "deposit" ? "#fb923c" : "#f87171", marginTop: "4px" }}>
                  {p.paymentStatus === "paid" 
                    ? tr.fullyPaid
                    : p.paymentStatus === "deposit"
                    ? `${tr.depositPaid} ₪${p.depositAmount || 0} · ${tr.remaining} ₪${(p.totalPrice - (p.depositAmount || 0)).toLocaleString()}`
                    : tr.notPaidYet}
                </div>
              </div>
            ))}

            {/* Regular Expenses */}
            {expenses.filter(e => !e.providerId).map((exp) => (
              <div key={exp.id} style={s.expenseItem}>
                <div style={s.expenseTop}>
                  <span style={s.expenseName}>{exp.name}</span>
                  <div style={s.expenseActions}>
                    <span style={s.expenseAmount}>₪{exp.amount.toLocaleString()}</span>
                    <button style={s.iconBtn} onClick={() => handleRemoveExpense(exp.id)}>×</button>
                  </div>
                </div>
                {exp.paymentStatus && exp.paymentStatus !== "unpaid" && (
                  <div style={{ fontSize: "12px", marginTop: "4px",
                    color: exp.paymentStatus === "paid" ? "#5A9E6F" : "#fb923c"
                  }}>
                    {exp.paymentStatus === "paid"
                      ? (language === "he" ? "שולם במלואו" : "Fully paid")
                      : (language === "he" ? `מקדמה ₪${exp.depositAmount || 0}` : `Deposit ₪${exp.depositAmount || 0}`)}
                  </div>
                )}
                <input style={s.commentInput} type="text" placeholder={tr.addComment}
                  value={exp.comment || ""}
                  onChange={(e) => handleExpenseComment(exp.id, e.target.value)} />
              </div>
            ))}
          </div>

          {/* CHECKLIST CARD*/}
          <div style={s.card}>
            <p style={s.cardTitle}>
              ✅ {tr.checklist}
              <span style={{ fontSize: "12px", color: "#A89080", marginLeft: "auto" }}>
                {doneCount}/{checklist.length} {tr.done}
              </span>
            </p>
            {checklist.map((item, i) => (
              <div key={i} style={s.checklistItem}>
                <div style={s.checkbox(item.done)} onClick={() => toggleChecklistItem(i)}>
                  {item.done && <span style={{ color: "#000", fontSize: "11px", fontWeight: "700" }}>✓</span>}
                </div>
                <span style={s.checkedText(item.done)} onClick={() => toggleChecklistItem(i)}>{item.text}</span>
                <button style={{ ...s.iconBtn, fontSize: "12px", opacity: 0.5 }}
                  onClick={() => setCalendarPopup({ 
                    title: item.text, 
                    description: `משימה: ${item.text}`,
                    time: "10:00",
                    reminder: 1440
                  })}>📅</button>
                <button style={{ ...s.iconBtn, fontSize: "14px", marginLeft: "4px", opacity: 0.4 }}
                  onClick={() => handleRemoveCheckItem(i)}>×</button>
              </div>
            ))}
            <div style={s.checklistAddRow}>
              <input style={{ ...s.input, fontSize: "13px" }} placeholder={tr.addChecklistItem}
                value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCheckItem()} />
              <button style={s.addBtn("rgba(74,222,128,0.25)")} onClick={handleAddCheckItem}>＋</button>
            </div>
          </div>

          {/* GUESTS CARD */}
          <div style={s.card}>
            <p style={s.cardTitle}>
              👥 {tr.guestList}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "14px" }}>
              <div style={{ textAlign: "center", background: "#F5EDE8", border: "1px solid #E8DDD5", borderRadius: "12px", padding: "10px 4px" }}>
                <span style={{ fontSize: "22px", fontWeight: "500", color: "#3d2c2c", display: "block" }}>
                  {guests.reduce((sum, g) => sum + (g.guestCount || 1), 0)}
                </span>
                <span style={{ fontSize: "11px", color: "#A89080" }}>{tr.invitedCount}</span>
              </div>
              <div style={{ textAlign: "center", background: "#D5E8D4", border: "1px solid #B8D4B6", borderRadius: "12px", padding: "10px 4px" }}>
                <span style={{ fontSize: "22px", fontWeight: "500", color: "#3A6B38", display: "block" }}>
                  {guests.filter(g => g.rsvpStatus === "confirmed").reduce((sum, g) => sum + (g.rsvpCount || g.guestCount || 1), 0)}
                </span>
                <span style={{ fontSize: "11px", color: "#A89080" }}>{tr.confirmedCount}</span>
              </div>
              <div style={{ textAlign: "center", background: "#F2D7D5", border: "1px solid #E0C0BD", borderRadius: "12px", padding: "10px 4px" }}>
                <span style={{ fontSize: "22px", fontWeight: "500", color: "#C17B7B", display: "block" }}>
                  {guests.filter(g => g.rsvpStatus === "declined").reduce((sum, g) => sum + (g.guestCount || 1), 0)}
                </span>
                <span style={{ fontSize: "11px", color: "#A89080" }}>{tr.declinedCount}</span>
              </div>
              <div style={{ textAlign: "center", background: "#FFF0D5", border: "1px solid #F0D8A8", borderRadius: "12px", padding: "10px 4px" }}>
                <span style={{ fontSize: "22px", fontWeight: "500", color: "#B07820", display: "block" }}>
                  {guests.filter(g => !g.rsvpStatus).length}
                </span>
                <span style={{ fontSize: "11px", color: "#A89080" }}>{tr.noAnswer}</span>
              </div>
            </div>
            <button
              style={{ width: "100%", padding: "10px", background: "rgba(139,92,246,0.15)", border: "1px solid #C9A8E0", borderRadius: "12px", color: "#8B5A8B", cursor: "pointer", fontSize: "13px", fontFamily: "'Heebo', sans-serif", marginBottom: "8px" }}
              onClick={() => setGuestPopup({})}
            >
              + {tr.addGuestBtn}
            </button>
            <button
              style={{ width: "100%", padding: "10px", background: "rgba(139,90,139,0.08)", border: "1px dashed #C9A8E0", borderRadius: "12px", color: "#8B5A8B", cursor: "pointer", fontSize: "13px", fontFamily: "'Heebo', sans-serif" }}
              onClick={() => setShowGuestTable(true)}
            >
              {tr.openGuestList}
            </button>
          </div>


          {/* PROVIDERS CARD*/}
          <div style={s.card}>
            <p style={s.cardTitle}>
              🏢 {tr.providers}
              <span style={{ fontSize: "12px", color: "#A89080", marginLeft: "auto" }}>
                {providers.length} {tr.added}
              </span>
            </p>
            <button style={{ ...s.addBtn("rgba(56,189,248,0.3)"), width: "100%", marginBottom: "12px" }}
              onClick={() => setProviderPopup("new")}>{tr.addProvider}</button>
            {providers.length === 0 ? <p style={s.emptyMsg}>{tr.noProviders}</p> : (
              <ul style={s.list}>
                {providers.map((p, i) => (
                  <li key={p.id || i} style={{ ...s.listItem, flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>🏢</span>
                        <div style={{ fontWeight: "500" }}>{p.name}</div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button style={{ ...s.iconBtn, fontSize: "14px" }}
                          onClick={() => setProviderPopup({ index: i, data: p })}>✏️</button>
                        <button style={s.iconBtn} onClick={() => handleRemoveProvider(i)}>×</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingRight: "28px" }}>
                      {p.serviceType && <span style={{ ...s.detailChip, color: "#38bdf8" }}>{p.serviceType}</span>}
                      {p.paymentStatus && (
                        <span style={{
                          ...s.detailChip,
                          color: p.paymentStatus === "paid" ? "#4ade80" : p.paymentStatus === "deposit" ? "#fb923c" : "#f87171",
                        }}>
                          {p.paymentStatus === "paid" ? " " : p.paymentStatus === "deposit" ? " " : " "}
                          {p.paymentStatus === "paid"
                            ? tr.paid
                            : p.paymentStatus === "deposit"
                            ? `${tr.deposit} ₪${p.depositAmount || 0}`
                            : tr.unpaid}
                        </span>
                      )}
                      {p.totalPrice > 0 && <span style={s.detailChip}>💰 ₪{p.totalPrice.toLocaleString()}</span>}
                      {p.phone && <span style={s.detailChip}>📞 {p.phone}</span>}
                      {p.email && <span style={s.detailChip}>✉️ {p.email}</span>}
                      {p.note && <span style={{ ...s.detailChip, fontStyle: "italic" }}>{p.note}</span>}
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
        language={language}
      />
    </div>
  );
}

export default Dashboard;
