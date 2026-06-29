// This is the main component that controls the entire app flow.
// It manages authentication state, loads events from Firestore,
// and decides which screen to render based on the current state.

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase/config";
import { db } from "./firebase/config";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import Auth from "./components/Auth";
import EventPicker from "./components/EventPicker";
import Dashboard from "./components/Dashboard";
import { translations } from "./translations";

// All inline styles for the main layout — sidebar, main area, buttons
const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    background: "#FAF7F2",
    fontFamily: "'Heebo', sans-serif",
  },
  sidebar: {
    width: "260px",
    flexShrink: 0,
    background: "#FDF0EC",
    borderRight: "1px solid #E8DDD5",
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    gap: "8px",
  },
  sidebarLogo: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#3d2c2c",
    margin: "0 0 24px 8px",
  },
  sidebarSection: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: "1px",
    textTransform: "uppercase",
    margin: "8px 0 4px 8px",
  },
  eventBtn: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "none",
    background: active ? "rgba(139,92,246,0.2)" : "transparent",
    color: active ? "#8B5A8B" : "#7a6060",
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
    fontSize: "14px",
    textAlign: "left",
    width: "100%",
    transition: "all 0.2s ease",
    borderLeft: active ? "2px solid #c084fc" : "2px solid transparent",
  }),
  newEventBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px dashed rgba(255,255,255,0.15)",
    background: "transparent",
    color: "#8B7060",
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
    fontSize: "14px",
    width: "100%",
    marginTop: "8px",
    transition: "all 0.2s ease",
  },
  sidebarBottom: {
    marginTop: "auto",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    paddingTop: "16px",
  },
  userInfo: {
    fontSize: "12px",
    color: "#A89080",
    marginBottom: "8px",
    padding: "0 8px",
    wordBreak: "break-all",
  },
  signOutBtn: {
    width: "100%",
    padding: "9px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "#7a6060",
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
  },
  main: {
    flex: 1,
    overflow: "auto",
  },
  loadingScreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#FAF7F2",
    color: "rgba(255,255,255,0.3)",
    fontFamily: "'Heebo', sans-serif",
    fontSize: "16px",
  },
};

const eventEmojis = {
  wedding: "💍",
  birthday: "🎂",
  corporate: "🏢",
  bar_mitzvah: "✡️",
};


function App() {
  const [user, setUser] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [language, setLanguage] = useState("he");
  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [sortByDate, setSortByDate] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const tr = translations[language];

  // Load events from Firestore whenever user logs in
  useEffect(() => {
    if (!user) return;
    setLoadingEvents(true);
    const q = query(
      collection(db, "events"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q).then((snap) => {
      const loaded = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(loaded);
      if (loaded.length > 0) setCurrentEventId(loaded[0].id);
      setLoadingEvents(false);
    }).catch((err) => {
      console.error("Error loading events:", err);
      setLoadingEvents(false);
    });
  }, [user]);


  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setEvents([]);
    setCurrentEventId(null);
    setShowPicker(false);
  };

  // Called after a new event is created in EventPicker
  const handleEventCreated = (event) => {
    setEvents((prev) => [event, ...prev]);
    setCurrentEventId(event.id);
    setShowPicker(false);
  };

  // Deletes an event from Firestore after confirmation
  const handleDeleteEvent = async (eventId) => {
    const eventToDelete = events.find(e => e.id === eventId);
    const hasData = (eventToDelete?.guestCount > 0);
    const warningMsg = language === "he"
      ? `האם בטוח שברצונך למחוק את "${eventToDelete?.title}"?\n\nכל הנתונים (אורחים, תקציב, ספקים, צ׳קליסט) יימחקו לצמיתות.`
      : `Delete "${eventToDelete?.title}"?\n\nAll data (guests, budget, providers, checklist) will be permanently deleted.`;
    if (!window.confirm(warningMsg)) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
      const remaining = events.filter((e) => e.id !== eventId);
      setEvents(remaining);
      if (currentEventId === eventId) {
        setCurrentEventId(remaining.length > 0 ? remaining[0].id : null);
      }
      if (remaining.length === 0) setShowPicker(true);
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  // Saves edited event fields (title, date, guestCount, region) to Firestore and updates local state
  const handleUpdateEvent = async (eventId, fields) => {
    try {
      await updateDoc(doc(db, "events", eventId), fields);
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...fields } : e));
      setEditingEvent(null);
    } catch (err) {
      console.error("Error updating event:", err);
    }
  };

  // Initiates drag — stores the dragged event's ID in state.
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };


  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const now = new Date();
    const targetEvent = events.find(ev => ev.id === targetId);
    const targetPast = targetEvent?.date && new Date(targetEvent.date) < now;
    if (targetPast) return;
    const draggedEvent = events.find(ev => ev.id === draggedId);
    const draggedPast = draggedEvent?.date && new Date(draggedEvent.date) < now;
    if (draggedPast) return;
    const from = events.findIndex(ev => ev.id === draggedId);
    const to = events.findIndex(ev => ev.id === targetId);
    const next = [...events];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setEvents(next);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDraggedId(null);
  };

  // Renders a single event row in the sidebar supporting drag-and-drop, edit, and delete
  const renderEvent = (event) => {
    const now = new Date();
    const isPast = event.date && new Date(event.date) < now;
    const days = event.date ? Math.ceil((new Date(event.date) - now) / (1000 * 60 * 60 * 24)) : null;
    return (
      <div
        key={event.id}
        onDragOver={(e) => handleDragOver(e, event.id)}
        onDrop={handleDrop}
        style={{
          display: "flex", alignItems: "center", gap: "4px",
          opacity: draggedId === event.id ? 0.4 : 1,
        }}
      >
        <button
          style={{ ...styles.eventBtn(event.id === currentEventId), flex: 1 }}
          onClick={() => setCurrentEventId(event.id)}
          onDragStart={(e) => handleDragStart(e, event.id)}
          draggable={!sortByDate && !isPast}
          onDragEnd={() => setDraggedId(null)}
        >
          <span>{eventEmojis[event.type] || "🎉"}</span>
          <span style={{
            flex: 1,
            textDecoration: isPast ? "line-through" : "none",
            color: isPast ? "#f87171" : "inherit",
          }}>{event.title}</span>
          {event.date && (
            <span style={{ fontSize: "10px", color: isPast ? "#f87171" : days <= 7 ? "#f87171" : "#A89080" }}>
              {isPast
                ? new Date(event.date).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" })
                : `${days} ימים`}
            </span>
          )}
        </button>
        {!isPast && (
          <button
            onClick={() => setEditingEvent(event)}
            style={{
              background: "none", border: "1px solid #D4B8E0",
              borderRadius: "6px", color: "#B090C0", cursor: "pointer",
              fontSize: "10px", padding: "2px 6px", lineHeight: 1,
              flexShrink: 0, fontFamily: "'Heebo', sans-serif",
            }}
          >{tr.editBtn}</button>
        )}
        <button
          onClick={() => handleDeleteEvent(event.id)}
          style={{ background: "none", border: "none", color: "#6B5B5B", cursor: "pointer", fontSize: "16px", padding: "4px", lineHeight: 1, flexShrink: 0 }}
        >×</button>
      </div>
    );
  };

  const currentEvent = events.find((e) => e.id === currentEventId);

  if (!user) {
    return <Auth onLogin={(u, token) => { setUser(u); setGoogleToken(token); }} />;
  }

  if (loadingEvents) {
    return <div style={styles.loadingScreen}>Loading your events…</div>;
  }

  if (showPicker) {
    return (
      <EventPicker
        user={user}
        onEventCreated={handleEventCreated}
        onLogout={handleLogout}
        language={language}
        onCancel={() => setShowPicker(false)}
    />
    );
  }

  if (events.length === 0 && !loadingEvents) {
    return (
      <EventPicker
        user={user}
        onEventCreated={handleEventCreated}
        onLogout={handleLogout}
        language={language}
    />
    );
  }

  return (
    <>
    {/* ── Edit Event Popup  */}
      {editingEvent && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(61,44,44,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)",
        }} onClick={() => setEditingEvent(null)}>
          <div style={{
            background: "#FDF9F5", borderRadius: "24px", padding: "32px",
            width: "100%", maxWidth: "420px", fontFamily: "'Heebo', sans-serif",
            direction: "rtl",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: "700", color: "#3d2c2c" }}>
              {tr.editEventTitle}
            </h2>

            <label style={{ display: "block", fontSize: "11px", color: "#8B7060", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "6px" }}>{tr.eventNameLabel}</label>
            <input
              style={{ width: "100%", padding: "10px 14px", background: "#F2EBE1", border: "1px solid #E0D5CC", borderRadius: "10px", color: "#3d2c2c", fontSize: "14px", fontFamily: "'Heebo', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "14px" }}
              value={editingEvent.title || ""}
              onChange={e => setEditingEvent(ev => ({ ...ev, title: e.target.value }))}
            />

            <label style={{ display: "block", fontSize: "11px", color: "#8B7060", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "6px" }}>{tr.dateLabel2}</label>
            <input
              type="date"
              style={{ width: "100%", padding: "10px 14px", background: "#F2EBE1", border: "1px solid #E0D5CC", borderRadius: "10px", color: "#3d2c2c", fontSize: "14px", fontFamily: "'Heebo', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "14px" }}
              value={editingEvent.date || ""}
              onChange={e => setEditingEvent(ev => ({ ...ev, date: e.target.value }))}
            />

            <label style={{ display: "block", fontSize: "11px", color: "#8B7060", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "6px" }}>{tr.guestCountLabel}</label>
            <input
              type="number"
              style={{ width: "100%", padding: "10px 14px", background: "#F2EBE1", border: "1px solid #E0D5CC", borderRadius: "10px", color: "#3d2c2c", fontSize: "14px", fontFamily: "'Heebo', sans-serif", outline: "none", boxSizing: "border-box", marginBottom: "14px" }}
              value={editingEvent.guestCount || ""}
              onChange={e => setEditingEvent(ev => ({ ...ev, guestCount: Number(e.target.value) }))}
            />

            <label style={{ display: "block", fontSize: "11px", color: "#8B7060", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "6px" }}>{tr.regionLabel}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "24px" }}>
              {[
                { id: "tel_aviv", label: "תל אביב והמרכז" },
                { id: "jerusalem", label: "ירושלים והסביבה" },
                { id: "haifa", label: "חיפה והצפון" },
                { id: "sharon", label: "השרון" },
                { id: "south", label: "דרום ונגב" },
                { id: "eilat", label: "אילת" },
                { id: "nationwide", label: "כל הארץ" },
              ].map(r => (
                <button key={r.id} onClick={() => setEditingEvent(ev => ({ ...ev, region: r.id }))}
                  style={{
                    padding: "8px 12px", borderRadius: "10px", cursor: "pointer",
                    fontSize: "13px", fontFamily: "'Heebo', sans-serif",
                    background: editingEvent.region === r.id ? "#DFC5EE" : "#F5EDE8",
                    border: `1px solid ${editingEvent.region === r.id ? "#B890D0" : "#E8DDD5"}`,
                    color: editingEvent.region === r.id ? "#8B5A8B" : "#7A6060",
                  }}
                >{r.label}</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handleUpdateEvent(editingEvent.id, {
                  title: editingEvent.title,
                  date: editingEvent.date,
                  guestCount: editingEvent.guestCount,
                  region: editingEvent.region,
                })}
                style={{ flex: 1, padding: "12px", background: "rgba(76, 185, 68, 0.4)", border: "none", borderRadius: "10px", color: "#3d2c2c", fontSize: "14px", cursor: "pointer", fontFamily: "'Heebo', sans-serif" }}
              >{tr.save}</button>
              <button
                onClick={() => setEditingEvent(null)}
                style={{ flex: 1, padding: "12px", background: "#F5EDE8", border: "1px solid #E8DDD5", borderRadius: "10px", color: "#7A6060", fontSize: "14px", cursor: "pointer", fontFamily: "'Heebo', sans-serif" }}
              >{tr.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout : Two-column flex layout: sidebar on the left, main content on the right. */}
      <div style={styles.layout}>
        <div style={{ ...styles.sidebar, width: sidebarOpen ? "260px" : "0px", overflow: "hidden", transition: "width 0.3s ease", padding: sidebarOpen ? "24px 16px" : "0" }}>
          <img src="/mefeekali-logo.svg" alt="MefeeKali" style={{ width: "150px", height: "auto", marginBottom: "24px", display: "block", margin: "0 auto 24px" }} />
              
              {/* Events List Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 4px 8px" }}>
                <p style={{ ...styles.sidebarSection, margin: 0, color: "#8B7060" }}>My Events</p>
                <button
                  onClick={() => setSortByDate(s => !s)}
                  title={sortByDate ? "Manual order" : "Sort by date"}
                  style={{
                    background: sortByDate ? "rgba(139,92,246,0.2)" : "transparent",
                    border: "none", borderRadius: "6px", cursor: "pointer",
                    fontSize: "12px", color: sortByDate ? "#8B5A8B" : "#A89080",
                    padding: "2px 6px", fontFamily: "'Heebo', sans-serif",
                    textDecoration: sortByDate ? "underline" : "none",
                  }}
                >
                  {tr.sortByDate}
                </button>
              </div>

              {/* Upcoming Events List*/}
              {(() => {
                const now = new Date();
                const sorted = sortByDate
                  ? [...events].sort((a, b) => {
                      const aDate = a.date ? new Date(a.date) : null;
                      const bDate = b.date ? new Date(b.date) : null;
                      const aPast = aDate && aDate < now;
                      const bPast = bDate && bDate < now;
                      if (aPast && !bPast) return 1;
                      if (!aPast && bPast) return -1;
                      if (!aDate) return 1;
                      if (!bDate) return -1;
                      return aDate - bDate;
                    })
                  : [...events].sort((a, b) => {
                      const aPast = a.date && new Date(a.date) < now;
                      const bPast = b.date && new Date(b.date) < now;
                      if (aPast && !bPast) return 1;
                      if (!aPast && bPast) return -1;
                      return 0;
                    });
                const upcoming = sorted.filter(e => !e.date || new Date(e.date) >= now);
                return <>{upcoming.map(renderEvent)}</>;
              })()}

            <button style={{ ...styles.newEventBtn, fontWeight: "700" }} onClick={() => setShowPicker(true)}>
              ＋ New event
            </button>

            {/* Past Events Section*/}
            {(() => {
              const now = new Date();
              const past = events.filter(e => e.date && new Date(e.date) < now);
              return past.length > 0 ? (
                <>
                  <p style={{ ...styles.sidebarSection, margin: "16px 0 4px 8px", color: "#f87171" }}>
                    {tr.pastEvents}
                  </p>
                  {past.map(renderEvent)}
                </>
              ) : null;
            })()}

          <div style={styles.sidebarBottom}>
            <p style={styles.userInfo}>{user.email}</p>
            <button
              style={{ ...styles.signOutBtn, marginBottom: "8px" }}
              onClick={() => setLanguage(language === "he" ? "en" : "he")}
            >
              {tr.languageToggle}
            </button>
            <button style={styles.signOutBtn} onClick={handleLogout}>
              {tr.signOut}
            </button>
          </div>
        </div>

        {/* Main Content Area*/}
        <div style={{ ...styles.main, position: "relative" }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              position: "absolute", top: "20px", left: "-12px",
              zIndex: 100, background: "#E8D5F2",
              border: "11px solid #C9A8E0", borderRadius: "50%",
              color: "#8B5A8B", cursor: "pointer", fontSize: "10px",
              padding: "6px 8px", transition: "left 0.3s ease",
              fontFamily: "'Heebo', sans-serif",
            }}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>

            {/* Renders Dashboard for selected event, or fallback message */}
            {currentEvent ? (
              <Dashboard user={user} event={currentEvent} onLogout={handleLogout} googleToken={googleToken} language={language} />
            ) : (
              <div style={{ color: "white", padding: "40px" }}>
                Select an event from the sidebar
              </div>
            )}

        </div>
      </div>
    </>
  );
}

export default App;