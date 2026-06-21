// ── Vision Board Component ────────────────────────────────────────────────────
// Full-screen overlay for searching and saving inspiration images per event.
// Uses Unsplash API for image search. Saved images are stored in Firestore
// as URL arrays under the event document.

import { useState, useEffect } from "react";
import { translations } from "../translations";
import { db } from "../firebase/config";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

export default function VisionBoard({ event, onClose, language }) {
  const tr = translations[language];
  const isRTL = language === "he";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [hoveredId, setHoveredId] = useState(null);

  // Load saved images from Firestore on mount
  useEffect(() => {
    const docRef = doc(db, "events", event.id);
    getDoc(docRef).then(snap => {
      if (snap.exists() && snap.data().visionBoard) {
        setSaved(snap.data().visionBoard);
      }
    });
  }, [event.id, language]);

  // Search Unsplash for images
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=30`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Unsplash error:", err);
    }
    setLoading(false);
  };

  // Save or remove image from board (toggle)
  const handleSave = async (img) => {
    const already = saved.find(s => s.id === img.id);
    if (already) {
      handleRemove(img.id);
      return;
    }
    const newItem = {
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.small,
      alt: img.alt_description || query,
      author: img.user.name,
    };
    const next = [...saved, newItem];
    setSaved(next);
    setSaving(true);
    try {
      await updateDoc(doc(db, "events", event.id), { visionBoard: next });
    } catch (err) {
      console.error("Save error:", err);
    }
    setSaving(false);
  };

  // Remove image from board
  const handleRemove = async (id) => {
    const next = saved.filter(s => s.id !== id);
    setSaved(next);
    await updateDoc(doc(db, "events", event.id), { visionBoard: next });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#FAF7F2",
      zIndex: 9999, display: "flex", flexDirection: "column",
      fontFamily: "'Heebo', sans-serif", direction: isRTL ? "rtl" : "ltr",
    }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 32px", borderBottom: "1px solid #E8DDD5",
        background: "rgba(236,182,210,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#3d2c2c" }}>
            🎨 Vision Board — {event.title}
          </h1>
          <div style={{ display: "flex", gap: "8px" }}>
            {["search", "board"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                onMouseEnter={e => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.background = "#DFC5EE";
                    e.currentTarget.style.borderColor = "#B890D0";
                    e.currentTarget.style.color = "#8B5A8B";
                  }
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.background = "#F5EDE8";
                    e.currentTarget.style.borderColor = "#E8DDD5";
                    e.currentTarget.style.color = "#7A6060";
                  }
                }}
                style={{
                  padding: "6px 16px", borderRadius: "20px", cursor: "pointer",
                  fontSize: "13px", fontFamily: "'Heebo', sans-serif",
                  background: activeTab === tab ? "#DFC5EE" : "#F5EDE8",
                  border: `1px solid ${activeTab === tab ? "#B890D0" : "#E8DDD5"}`,
                  color: activeTab === tab ? "#8B5A8B" : "#7A6060",
                  transition: "all 0.2s ease",
                }}>
                {tab === "search" ? (language === "he" ? "🔍 חיפוש" : "🔍 Search") : `🖼️ ${language === "he" ? "הלוח שלי" : "My Board"} (${saved.length})`}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {saving && <span style={{ fontSize: "12px", color: "#fb923c" }}>● {language === "he" ? "שומר..." : "saving..."}</span>}
          <button onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background = "#E8DDD5"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F2EBE1"; }}
            style={{
              padding: "10px 20px", background: "#F2EBE1",
              border: "1px solid #E0D5CC", borderRadius: "10px",
              color: "#5A4040", cursor: "pointer", fontSize: "14px",
              fontFamily: "'Heebo', sans-serif", transition: "all 0.2s ease",
            }}>
            ✕ {language === "he" ? "סגור" : "Close"}
          </button>
        </div>
      </div>

      {/* Search Tab */}
      {activeTab === "search" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Search bar */}
          <div style={{ padding: "20px 32px", borderBottom: "1px solid #F5EDE8" }}>
            <div style={{ display: "flex", gap: "10px", maxWidth: "600px" }}>
              <input
                style={{
                  flex: 1, padding: "12px 16px",
                  background: "#F2EBE1", border: "1px solid #E0D5CC",
                  borderRadius: "12px", color: "#3d2c2c", fontSize: "14px",
                  fontFamily: "'Heebo', sans-serif", outline: "none",
                }}
                placeholder={language === "he" ? "חפשי השראה... למשל: חתונה פרחים, שמלת כלה, אולם..." : "Search inspiration... e.g. wedding flowers, bridal dress, venue..."}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(236,182,210,0.7)";
                  e.currentTarget.style.borderColor = "rgba(200,140,180,0.7)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(236,182,210,0.4)";
                  e.currentTarget.style.borderColor = "rgba(200,140,180,0.4)";
                }}
                style={{
                  padding: "12px 24px", background: "rgba(236,182,210,0.4)",
                  border: "1px solid rgba(200,140,180,0.4)", borderRadius: "12px",
                  color: "#a0507a", cursor: "pointer", fontSize: "14px",
                  fontFamily: "'Heebo', sans-serif", whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                }}
              >
                {language === "he" ? "חפשי ✨" : "Search ✨"}
              </button>
            </div>

            {/* Quick tags */}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              {(event.type === "wedding"
                ? ["wedding flowers", "bridal bouquet", "wedding venue", "wedding cake", "table setting", "wedding decor"]
                : event.type === "birthday"
                ? ["birthday flowers", "celebration cake", "party decoration", "balloon decor", "festive table"]
                : event.type === "bar_mitzvah"
                ? ["elegant party decor", "floral centerpiece", "luxury celebration", "event flowers", "festive decoration"]
                : ["conference room", "corporate dinner", "event stage", "business meeting", "office party"]
              ).map(tag => (
                <button key={tag}
                  onClick={() => { setQuery(tag); setTimeout(handleSearch, 100); }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "#DFC5EE";
                    e.currentTarget.style.borderColor = "#B890D0";
                    e.currentTarget.style.color = "#8B5A8B";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "#F5EDE8";
                    e.currentTarget.style.borderColor = "#E8DDD5";
                    e.currentTarget.style.color = "#8B7060";
                  }}
                  style={{
                    padding: "5px 12px", borderRadius: "20px", cursor: "pointer",
                    fontSize: "12px", fontFamily: "'Heebo', sans-serif",
                    background: "#F5EDE8", border: "1px solid #E8DDD5", color: "#8B7060",
                    transition: "all 0.2s ease",
                  }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Results grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px", color: "#A89080" }}>
                {language === "he" ? "מחפשת..." : "Searching..."}
              </div>
            )}
            {!loading && results.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px", color: "#C4B0A8", fontSize: "16px" }}>
                {language === "he" ? "חפשי השראה למעלה ✨" : "Search for inspiration above ✨"}
              </div>
            )}
            <div style={{ columns: "4 200px", columnGap: "12px" }}>
              {results.map(img => {
                const isSaved = saved.find(s => s.id === img.id);
                const isHovered = hoveredId === img.id;
                return (
                  <div key={img.id}
                    onClick={() => handleSave(img)}
                    onMouseEnter={() => setHoveredId(img.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      breakInside: "avoid", marginBottom: "12px",
                      position: "relative", cursor: "pointer",
                      transform: isHovered ? "scale(1.03)" : "scale(1)",
                      transition: "transform 0.2s ease",
                      zIndex: isHovered ? 2 : 1,
                    }}
                  >
                    <div style={{
                      borderRadius: "12px", overflow: "hidden",
                      border: isSaved ? "3px solid #B890D0" : isHovered ? "3px solid #DFC5EE" : "3px solid transparent",
                      transition: "border 0.2s ease",
                    }}>
                      <img
                        src={img.urls.small}
                        alt={img.alt_description}
                        style={{ width: "100%", display: "block" }}
                      />
                      {isSaved && (
                        <div style={{
                          position: "absolute", top: "8px", right: "8px",
                          background: "#B890D0", borderRadius: "50%",
                          width: "24px", height: "24px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", color: "white",
                        }}>✓</div>
                      )}
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                        padding: "20px 8px 8px",
                        opacity: isHovered ? 1 : 0,
                        transition: "opacity 0.2s ease",
                      }}>
                        <span style={{ fontSize: "11px", color: "white" }}>📷 {img.user.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Board Tab */}
      {activeTab === "board" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {saved.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px", color: "#C4B0A8", fontSize: "16px" }}>
              {language === "he" ? "הלוח שלך ריק — חפשי תמונות ולחצי עליהן כדי להוסיף ✨" : "Your board is empty — search for images and click to add them ✨"}
            </div>
          ) : (
            <div style={{ columns: "4 200px", columnGap: "12px" }}>
              {saved.map(img => (
                <div key={img.id} style={{
                  breakInside: "avoid", marginBottom: "12px",
                  borderRadius: "12px", overflow: "hidden",
                  position: "relative",
                }}>
                  <img src={img.url} alt={img.alt} style={{ width: "100%", display: "block" }} />
                  <button
                    onClick={() => handleRemove(img.id)}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.75)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.5)"; }}
                    style={{
                      position: "absolute", top: "8px", right: "8px",
                      background: "rgba(0,0,0,0.5)", border: "none",
                      borderRadius: "50%", width: "28px", height: "28px",
                      color: "white", cursor: "pointer", fontSize: "14px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                  >×</button>
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                    padding: "20px 8px 8px",
                  }}>
                    <span style={{ fontSize: "11px", color: "white" }}>📷 {img.author}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}