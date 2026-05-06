import { useState } from "react";
import { translations } from "../translations";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const getEventTypes = (tr) => [
  { id: "wedding", emoji: "💍", title: tr.wedding, description: tr.weddingDesc, color: "#c084fc", glow: "rgba(192,132,252,0.15)" },
  { id: "birthday", emoji: "🎂", title: tr.birthday, description: tr.birthdayDesc, color: "#fb923c", glow: "rgba(251,146,60,0.15)" },
  { id: "corporate", emoji: "🏢", title: tr.corporate, description: tr.corporateDesc, color: "#38bdf8", glow: "rgba(56,189,248,0.15)" },
  { id: "bar_mitzvah", emoji: "✡️", title: tr.barMitzvah, description: tr.barMitzvahDesc, color: "#4ade80", glow: "rgba(74,222,128,0.15)" },
];

const getRegions = (tr) => [
  { id: "tel_aviv", label: tr.telAviv },
  { id: "jerusalem", label: tr.jerusalem },
  { id: "haifa", label: tr.haifa },
  { id: "sharon", label: tr.sharon },
  { id: "south", label: tr.south },
  { id: "eilat", label: tr.eilat },
  { id: "nationwide", label: tr.nationwide },
];

const s = {
  page: {
    minHeight: "100vh", background: "#0d0d0f", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif",
    padding: "40px 20px", position: "relative", overflow: "hidden",
  },
  bgCircle1: {
    position: "absolute", width: "600px", height: "600px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
    top: "-200px", right: "-100px", pointerEvents: "none",
  },
  bgCircle2: {
    position: "absolute", width: "400px", height: "400px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)",
    bottom: "-100px", left: "-100px", pointerEvents: "none",
  },
  header: { textAlign: "center", marginBottom: "48px", position: "relative", zIndex: 1 },
  greeting: { fontSize: "14px", color: "rgba(255,255,255,0.35)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "12px" },
  title: { fontSize: "36px", fontWeight: "700", color: "#ffffff", margin: "0 0 12px", letterSpacing: "-0.5px" },
  subtitle: { fontSize: "16px", color: "rgba(255,255,255,0.4)", margin: 0 },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px",
    maxWidth: "680px", width: "100%", position: "relative", zIndex: 1,
  },
  card: (color, glow, hovered) => ({
    background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${hovered ? color : "rgba(255,255,255,0.08)"}`,
    borderRadius: "20px", padding: "32px 24px", cursor: "pointer",
    transition: "all 0.25s ease", textAlign: "left",
    boxShadow: hovered ? `0 0 40px ${glow}` : "none",
    transform: hovered ? "translateY(-3px)" : "translateY(0)",
  }),
  cardEmoji: { fontSize: "40px", display: "block", marginBottom: "16px" },
  cardTitle: (color) => ({ fontSize: "20px", fontWeight: "600", color, margin: "0 0 8px" }),
  cardDesc: { fontSize: "14px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: "1.6" },
  logoutBar: { position: "fixed", top: "20px", right: "24px", zIndex: 10 },
  logoutBtn: {
    padding: "8px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px", color: "rgba(255,255,255,0.4)", fontSize: "13px",
    cursor: "pointer", fontFamily: "'Georgia', serif",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, backdropFilter: "blur(6px)",
  },
  popup: {
    background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "24px", padding: "40px 36px", width: "100%", maxWidth: "460px",
    fontFamily: "'Georgia', serif", maxHeight: "90vh", overflowY: "auto",
  },
  popupEmoji: { fontSize: "44px", display: "block", marginBottom: "12px" },
  popupTitle: { fontSize: "22px", fontWeight: "700", color: "#ffffff", margin: "0 0 6px" },
  popupSub: { fontSize: "14px", color: "rgba(255,255,255,0.35)", margin: "0 0 28px", lineHeight: "1.6" },
  fieldGroup: { marginBottom: "16px" },
  label: {
    display: "block", fontSize: "11px", color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "8px",
  },
  input: {
    width: "100%", padding: "12px 14px", boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px", color: "#ffffff", fontSize: "14px",
    fontFamily: "'Georgia', serif", outline: "none",
  },
  regionGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
  },
  regionBtn: (selected) => ({
    padding: "10px 12px", borderRadius: "10px", cursor: "pointer",
    fontSize: "13px", fontFamily: "'Georgia', serif", textAlign: "center",
    transition: "all 0.2s ease",
    background: selected ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${selected ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.08)"}`,
    color: selected ? "#c084fc" : "rgba(255,255,255,0.5)",
  }),
  divider: {
    height: "1px", background: "rgba(255,255,255,0.06)", margin: "20px 0",
  },
  skipNote: {
    fontSize: "12px", color: "rgba(255,255,255,0.2)", textAlign: "center", margin: "0 0 20px",
  },
  popupActions: { display: "flex", gap: "10px", marginTop: "24px" },
  popupConfirm: (color) => ({
    flex: 1, padding: "13px", background: color ? `${color}44` : "rgba(139,92,246,0.4)",
    border: `1px solid ${color || "#c084fc"}66`, borderRadius: "12px",
    color: "#ffffff", fontSize: "15px", fontWeight: "600",
    cursor: "pointer", fontFamily: "'Georgia', serif",
  }),
  popupCancel: {
    padding: "13px 20px", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
    color: "rgba(255,255,255,0.4)", fontSize: "15px",
    cursor: "pointer", fontFamily: "'Georgia', serif",
  },
  loadingOverlay: {
    position: "fixed", inset: 0, background: "rgba(13,13,15,0.9)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200,
  },
  loadingEmoji: { fontSize: "48px", marginBottom: "16px", display: "block" },
  loadingText: { fontSize: "18px", color: "rgba(255,255,255,0.6)", fontFamily: "'Georgia', serif" },
};

function EventPicker({ user, onEventCreated, onLogout, language = "he", onCancel }) {
  const tr = translations[language];
  const isRTL = language === "he";
  const eventTypes = getEventTypes(tr);
  const regions = getRegions(tr);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [region, setRegion] = useState("");

  const handleCardClick = (eventType) => {
    setSelectedType(eventType);
    setEventName("");
    setEventDate("");
    setGuestCount("");
    setRegion("");
  };

  const handleConfirm = async () => {
    if (!selectedType) return;
    setLoading(true);

    const finalName = eventName.trim() || `My ${selectedType.title}`;

    try {
      const docRef = await addDoc(collection(db, "events"), {
        userId: user.uid,
        userEmail: user.email,
        type: selectedType.id,
        title: finalName,
        date: eventDate || null,
        guestCount: guestCount ? Number(guestCount) : null,
        region: region || null,
        createdAt: serverTimestamp(),
        budget: { total: 0 },
        expenses: [],
        guests: [],
        providers: [],
      });

      onEventCreated({
        id: docRef.id,
        type: selectedType.id,
        title: finalName,
        date: eventDate || null,
        guestCount: guestCount ? Number(guestCount) : null,
        region: region || null,
      });
    } catch (err) {
      console.error("Error creating event:", err);
      setLoading(false);
    }
  };

  return (
    <>
      <div style={s.logoutBar}>
        {onCancel && (
          <button style={{ ...s.logoutBtn, marginLeft: "8px" }} onClick={onCancel}>
            {tr.cancel}
          </button>
        )}
        <button style={s.logoutBtn} onClick={onLogout}>{tr.signOut}</button>
      </div>

      {loading && (
        <div style={s.loadingOverlay}>
          <span style={s.loadingEmoji}>{selectedType?.emoji}</span>
          <p style={s.loadingText}>{tr.settingUp} {eventName.trim() || selectedType?.title}...</p>
        </div>
      )}

      {selectedType && !loading && (
        <div style={s.overlay} onClick={() => setSelectedType(null)}>
          <div style={{ ...s.popup, direction: isRTL ? "rtl" : "ltr" }} onClick={(e) => e.stopPropagation()}>
            <span style={s.popupEmoji}>{selectedType.emoji}</span>
            <h2 style={s.popupTitle}>{tr.letsSetUp} {selectedType.title}</h2>
            <p style={s.popupSub}>{tr.popupSub}</p>

            {/* Event name */}
            <div style={s.fieldGroup}>
              <label style={s.label}>{tr.eventName}</label>
              <input
                style={s.input}
                placeholder={
                  selectedType.id === "wedding" ? (language === "he" ? 'למשל: "החתונה של שרה ותום"' : 'e.g. "Sarah & Tom\'s Wedding"') :
                  selectedType.id === "birthday" ? (language === "he" ? 'למשל: "יום הולדת 30 של דנה"' : 'e.g. "Dana\'s 30th Birthday"') :
                  selectedType.id === "corporate" ? (language === "he" ? 'למשל: "כנס שנתי 2026"' : 'e.g. "Annual Conference 2026"') :
                  language === "he" ? 'למשל: "בר מצווה של יוסי"' : 'e.g. "Yossi\'s Bar Mitzvah"'
                }
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Date */}
            <div style={s.fieldGroup}>
              <label style={s.label}>{tr.eventDate}</label>
              <input
                style={s.input}
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            {/* Guest count */}
            <div style={s.fieldGroup}>
              <label style={s.label}>{tr.guestCount}</label>
              <input
                style={s.input}
                type="number"
                placeholder="e.g. 150"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>

            <div style={s.divider} />

            {/* Region */}
            <div style={s.fieldGroup}>
              <label style={s.label}>{tr.preferredRegion}</label>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", margin: "0 0 12px" }}>
                {tr.regionNote}
              </p>
              <div style={s.regionGrid}>
                {regions.map((r) => (
                  <button
                    key={r.id}
                    style={s.regionBtn(region === r.id)}
                    onClick={() => setRegion(r.id === region ? "" : r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <p style={s.skipNote}>{tr.skipNote}</p>
            <div style={s.popupActions}>
              <button style={s.popupConfirm(selectedType.color)} onClick={handleConfirm}>
                {tr.createEvent}
              </button>
              <button style={s.popupCancel} onClick={() => setSelectedType(null)}>
                {tr.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.page}>
        <div style={s.bgCircle1} />
        <div style={s.bgCircle2} />

        <div style={s.header}>
          <p style={s.greeting}>{tr.welcome}, {user.displayName || user.email}</p>
          <h1 style={s.title}>{tr.whatPlanning} 🎊</h1>
          <p style={s.subtitle}>{tr.chooseEvent}</p>
        </div>

        <div style={s.grid}>
          {eventTypes.map((et) => (
            <div
              key={et.id}
              style={s.card(et.color, et.glow, hoveredId === et.id)}
              onClick={() => handleCardClick(et)}
              onMouseEnter={() => setHoveredId(et.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span style={s.cardEmoji}>{et.emoji}</span>
              <h2 style={s.cardTitle(et.color)}>{et.title}</h2>
              <p style={s.cardDesc}>{et.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default EventPicker;