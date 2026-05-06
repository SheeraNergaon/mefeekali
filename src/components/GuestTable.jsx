import { useState } from "react";

export default function GuestTable({ guests, onClose, onUpdateGuest, language }) {
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterBy, setFilterBy] = useState("all");

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const sorted = [...guests]
    .filter(g => {
        if (filterBy === "all") return true;
        if (filterBy === "bride") return g.invitedBy === "כלה";
        if (filterBy === "groom") return g.invitedBy === "חתן";
        if (filterBy === "invited") return g.invitationSent;
        if (filterBy === "confirmed") return g.rsvpStatus === "confirmed";
        if (filterBy === "declined") return g.rsvpStatus === "declined";
        if (filterBy === "no_answer") return g.rsvpStatus === "no_answer";
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortBy] || "";
      let valB = b[sortBy] || "";
      if (sortBy === "guestCount") { valA = a.guestCount || 1; valB = b.guestCount || 1; }
      const result = typeof valA === "number"
        ? valA - valB
        : String(valA).localeCompare(String(valB), "he");
      return sortDir === "asc" ? result : -result;
    });

  const totalGuests = guests.reduce((sum, g) => sum + (g.guestCount || 1), 0);
  const totalConfirmed = guests.filter(g => g.rsvpStatus === "confirmed").reduce((sum, g) => sum + (g.rsvpCount || g.guestCount || 1), 0);
  const totalInvited = guests.filter(g => g.invitationSent).length;

  const SortArrow = ({ field }) => (
    <span style={{ marginRight: "4px", opacity: sortBy === field ? 1 : 0.3 }}>
      {sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const thStyle = (field) => ({
    padding: "12px 16px", textAlign: "right", cursor: "pointer",
    fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)",
    letterSpacing: "0.8px", textTransform: "uppercase",
    borderBottom: "2px solid rgba(139,92,246,0.3)",
    background: "rgba(139,92,246,0.05)",
    whiteSpace: "nowrap", userSelect: "none",
  });

  const tdStyle = {
    padding: "12px 16px", textAlign: "right",
    fontSize: "14px", color: "rgba(255,255,255,0.8)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    verticalAlign: "middle",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#0d0d0f",
      zIndex: 9999, display: "flex", flexDirection: "column",
      fontFamily: "'Georgia', serif", direction: language === "he" ? "rtl" : "ltr",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(139,92,246,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#ffffff" }}>
            👥 {language === "he" ? "רשימת מוזמנים" : "Guest List"}
          </h1>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
            {language === "he" ? `סה״כ ${totalGuests} מוזמנים` : `Total ${totalGuests} guests`}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ textAlign: "center", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#4ade80" }}>{totalConfirmed}</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{language === "he" ? "אישרו" : "Confirmed"}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#38bdf8" }}>{totalInvited}</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{ language === "he" ? "נשלחו הזמנות" : "Invites Sent"}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#fb923c" }}>{guests.length - totalInvited}</div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{ language === "he" ? "לא נשלחו הזמנות" : "Invites Not Sent"}</div>
          </div>
          <button onClick={onClose} style={{
            padding: "10px 20px", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
            color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "14px",
            fontFamily: "'Georgia', serif",
          }}>
            ✕ {language === "he" ? "סגור" : "Close"}
          </button>
        </div>
      </div>

        <div style={{ display: "flex", gap: "8px", padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center", flexWrap: "wrap" }}>
            {/* filters */}
            {[
                { key: "all", label: language === "he" ? "הכל" : "All" },
                { key: "bride", label: language === "he" ? "👰 כלה" : "👰 Bride" },
                { key: "groom", label: language === "he" ? "🤵 חתן" : "🤵 Groom" },
            ].map(f => (
                <button key={f.key} onClick={() => setFilterBy(f.key)} style={{
                    padding: "7px 16px", borderRadius: "20px", cursor: "pointer",
                    fontSize: "13px", fontFamily: "'Georgia', serif",
                    background: filterBy === f.key ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${filterBy === f.key ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.08)"}`,
                    color: filterBy === f.key ? "#c084fc" : "rgba(255,255,255,0.5)",
                }}>
                    {f.label}
                </button>
            ))}

            {/* sort */}
            <div style={{ marginRight: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                    {language === "he" ? "מיין לפי:" : "Sort by:"}
                </span>
                {[
                    { key: "name", label: language === "he" ? "א-ב" : "A-Z" },
                    { key: "invitedBy", label: language === "he" ? "מזמין" : "Invited By" },
                    { key: "rsvpStatus", label: language === "he" ? "סטטוס" : "Status" },
                    { key: "invitationSent", label: language === "he" ? "הזמנה" : "Invite" },
                ].map(s => (
                    <button key={s.key} onClick={() => handleSort(s.key)} style={{
                        padding: "7px 14px", borderRadius: "20px", cursor: "pointer",
                        fontSize: "13px", fontFamily: "'Georgia', serif",
                        background: sortBy === s.key ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${sortBy === s.key ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: sortBy === s.key ? "#38bdf8" : "rgba(255,255,255,0.5)",
                    }}>
                        {s.label} {sortBy === s.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                ))}
            </div>
        </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr>
              <th style={thStyle("name")} onClick={() => handleSort("name")}>
                <SortArrow field="name" />{language === "he" ? "שם" : "Name"}
              </th>
              <th style={thStyle("invitedBy")} onClick={() => handleSort("invitedBy")}>
                <SortArrow field="invitedBy" />{language === "he" ? "מזמין" : "Invited By"}
              </th>
              <th style={thStyle("guestCount")} onClick={() => handleSort("guestCount")}>
                <SortArrow field="guestCount" />{language === "he" ? "כמות" : "Count"}
              </th>
              <th style={thStyle("phone")}>
                {language === "he" ? "טלפון" : "Phone"}
              </th>
              <th style={{ ...thStyle("invitationSent"), textAlign: "center" }}>
                {language === "he" ? "הזמנה נשלחה" : "Invite Sent"}
              </th>
              <th style={{ ...thStyle("rsvpConfirmed"), textAlign: "center" }}>
                {language === "he" ? "אישר הגעה" : "RSVP"}
              </th>
              <th style={{ ...thStyle("rsvpCount"), textAlign: "center" }}>
                {language === "he" ? "כמה מגיעים" : "Attending"}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, i) => (
              <tr key={g.id || i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: "600" }}>{g.name}</div>
                  {g.note && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{g.note}</div>}
                </td>
                <td style={tdStyle}>
                  {g.invitedBy ? (
                    <span style={{
                      fontSize: "12px", padding: "3px 10px", borderRadius: "12px",
                      background: g.invitedBy === "כלה" ? "rgba(192,132,252,0.15)" : "rgba(56,189,248,0.15)",
                      color: g.invitedBy === "כלה" ? "#c084fc" : "#38bdf8",
                      border: `1px solid ${g.invitedBy === "כלה" ? "rgba(192,132,252,0.3)" : "rgba(56,189,248,0.3)"}`,
                    }}>
                      {g.invitedBy === "כלה" ? "👰" : "🤵"} {g.invitedBy}
                    </span>
                  ) : "—"}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>{g.guestCount || 1}</td>
                <td style={tdStyle}>{g.phone || "—"}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button onClick={() => onUpdateGuest(g.id || i, { invitationSent: !g.invitationSent })} style={{
                    width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", border: "none",
                    background: g.invitationSent ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.05)",
                    fontSize: "16px",
                  }}>
                    {g.invitationSent ? "✅" : "⬜"}
                  </button>
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                        onClick={() => onUpdateGuest(g.id || i, { rsvpStatus: g.rsvpStatus === "confirmed" ? null : "confirmed" })}
                        style={{
                            padding: "4px 10px", borderRadius: "8px", cursor: "pointer", border: "none",
                            background: g.rsvpStatus === "confirmed" ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.05)",
                            color: g.rsvpStatus === "confirmed" ? "#4ade80" : "rgba(255,255,255,0.4)",
                            fontSize: "12px", fontFamily: "'Georgia', serif",
                            outline: g.rsvpStatus === "confirmed" ? "1px solid #4ade80" : "none",
                        }}
                        >
                        {language === "he" ? "מגיע" : "Coming"}
                        </button>
                        <button
                            onClick={() => onUpdateGuest(g.id || i, { rsvpStatus: g.rsvpStatus === "declined" ? null : "declined" })}
                            style={{
                                padding: "4px 10px", borderRadius: "8px", cursor: "pointer", border: "none",
                                background: g.rsvpStatus === "declined" ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.05)",
                                color: g.rsvpStatus === "declined" ? "#f87171" : "rgba(255,255,255,0.4)",
                                fontSize: "12px", fontFamily: "'Georgia', serif",
                                outline: g.rsvpStatus === "declined" ? "1px solid #f87171" : "none",
                            }}
                        >
                             {language === "he" ? "לא מגיע" : "Not Coming"}
                        </button>
                        <button
                            onClick={() => onUpdateGuest(g.id || i, { rsvpStatus: g.rsvpStatus === "no_answer" ? null : "no_answer" })}
                            style={{
                                padding: "4px 10px", borderRadius: "8px", cursor: "pointer", border: "none",
                                background: g.rsvpStatus === "no_answer" ? "rgba(251,146,60,0.25)" : "rgba(255,255,255,0.05)",
                                color: g.rsvpStatus === "no_answer" ? "#fb923c" : "rgba(255,255,255,0.4)",
                                fontSize: "12px", fontFamily: "'Georgia', serif",
                                outline: g.rsvpStatus === "no_answer" ? "1px solid #fb923c" : "none",
                            }}
                        >
                             {language === "he" ? "אין מענה" : "No Answer"}
                        </button>
                    </div>
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {g.rsvpStatus === "confirmed" ? (
                    <select
                        value={g.rsvpCount || g.guestCount || 1}
                        onChange={(e) => onUpdateGuest(g.id || i, { rsvpCount: Number(e.target.value) })}
                        style={{
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px", color: "#ffffff", padding: "4px 8px",
                            fontFamily: "'Georgia', serif", fontSize: "14px", cursor: "pointer",
                        }}
                    >
                            {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.2)", fontSize: "16px" }}>
            {language === "he" ? "אין אורחים להצגה" : "No guests to display"}
          </div>
        )}
      </div>
    </div>
  );
}