import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase/config";
import { db } from "./firebase/config";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import Auth from "./components/Auth";
import EventPicker from "./components/EventPicker";
import Dashboard from "./components/Dashboard";

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

  const handleEventCreated = (event) => {
    setEvents((prev) => [event, ...prev]);
    setCurrentEventId(event.id);
    setShowPicker(false);
  };

  const handleDeleteEvent = async (eventId) => {
  if (!window.confirm("Delete this event? This cannot be undone.")) return;
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
    <div style={styles.layout}>
      <div style={{ ...styles.sidebar, width: sidebarOpen ? "260px" : "0px", overflow: "hidden", transition: "width 0.3s ease", padding: sidebarOpen ? "24px 16px" : "0" }}>
        <h1 style={styles.sidebarLogo}>🎊 MefeeKali</h1>
        <p style={styles.sidebarSection}>My Events</p>
        {events.map((event) => (
    <div key={event.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        style={styles.eventBtn(event.id === currentEventId)}
        onClick={() => setCurrentEventId(event.id)}
      >
        <span>{eventEmojis[event.type] || "🎉"}</span>
        <span style={{ flex: 1 }}>{event.title}</span>
      </button>
      <button
        onClick={() => handleDeleteEvent(event.id)}
        style={{
          position: "absolute", right: "8px",
          background: "none", border: "none",
          color: "rgba(255,255,255,0.2)", cursor: "pointer",
          fontSize: "16px", padding: "4px", lineHeight: 1,
          transition: "color 0.2s",
        }}
        title="Delete event"
      >×</button>
    </div>
  ))}
        <button style={styles.newEventBtn} onClick={() => setShowPicker(true)}>
          ＋ New event
        </button>
        <div style={styles.sidebarBottom}>
          <p style={styles.userInfo}>{user.email}</p>
          <button
            style={{ ...styles.signOutBtn, marginBottom: "8px" }}
            onClick={() => setLanguage(language === "he" ? "en" : "he")}
          >
            {language === "he" ? "🇺🇸 English" : "🇮🇱 עברית"}
          </button>
          <button style={styles.signOutBtn} onClick={handleLogout}>
            {language === "he" ? "התנתק" : "Sign out"}
          </button>
        </div>
      </div>

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
        {currentEvent ? (
          <Dashboard user={user} event={currentEvent} onLogout={handleLogout} googleToken={googleToken} language={language} />
        ) : (
          <div style={{ color: "white", padding: "40px" }}>
            Select an event from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}

export default App;