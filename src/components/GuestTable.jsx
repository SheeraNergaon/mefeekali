// ── Guest Table Component ────────────────────────────────────────────────────
// Full-screen overlay that displays the complete guest list for an event.
// Supports sorting (using Merge Sort), filtering, Excel export,
// inline editing, RSVP updates, invitation status toggling, and guest deletion.

import { useState } from "react";
import * as XLSX from "xlsx";
import { translations } from "../translations";

// ── Merge Sort Implementation ─────────────────────────────────────────────────
// Sorts an array of guest objects by a given field and direction.
// Time complexity: O(n log n) in all cases.
// Space complexity: O(n) — creates new arrays during merge.

function mergeSort(arr, field, dir) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), field, dir);
  const right = mergeSort(arr.slice(mid), field, dir);
  return merge(left, right, field, dir);
}

function merge(left, right, field, dir) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    let comparison = 0;
    if (field === "name") {
      comparison = (left[i].name || "").localeCompare(right[j].name || "", "he");
    } else if (field === "rsvpStatus") {
      comparison = (left[i].rsvpStatus || "").localeCompare(right[j].rsvpStatus || "");
    } else if (field === "invitationSent") {
      comparison = (left[i].invitationSent ? 1 : 0) - (right[j].invitationSent ? 1 : 0);
    } else if (field === "invitedBy") {
      comparison = (left[i].invitedBy || "").localeCompare(right[j].invitedBy || "", "he");
    } else if (field === "guestCount") {
      comparison = (left[i].guestCount || 1) - (right[j].guestCount || 1);
    }
    if (dir === "desc") comparison *= -1;
    if (comparison <= 0) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return [...result, ...left.slice(i), ...right.slice(j)];
}

export default function GuestTable({ guests, onClose, onUpdateGuest, onRemoveGuest, language }) {
  const tr = translations[language];
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterBy, setFilterBy] = useState("all");
  const [editingCell, setEditingCell] = useState(null); // { id, field }

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const filtered = [...guests].filter(g => {
    if (filterBy === "all") return true;
    if (filterBy === "bride") return g.invitedBy === "כלה";
    if (filterBy === "groom") return g.invitedBy === "חתן";
    if (filterBy === "invited") return g.invitationSent;
    if (filterBy === "confirmed") return g.rsvpStatus === "confirmed";
    if (filterBy === "declined") return g.rsvpStatus === "declined";
    if (filterBy === "no_answer") return g.rsvpStatus === "no_answer";
    return true;
  });

  const sorted = mergeSort([...filtered], sortBy, sortDir);

  const exportToExcel = () => {
    const headers = [tr.colName, tr.colPhone, tr.colInvitedBy, tr.guests, tr.colInviteSent, tr.colRSVP, tr.colAttending, tr.note];
    const rows = guests.map(g => [
      g.name || "",
      g.phone || "",
      g.invitedBy || "",
      g.guestCount || 1,
      g.invitationSent ? tr.yes : tr.no,
      g.rsvpStatus === "confirmed" ? tr.coming
        : g.rsvpStatus === "declined" ? tr.notComing
        : g.rsvpStatus === "no_answer" ? tr.noAnswer : "",
      g.rsvpStatus === "confirmed" ? (g.rsvpCount || g.guestCount || 1) : "",
      g.note || "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tr.sheetName);
    XLSX.writeFile(wb, `guest_list_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

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
    fontSize: "12px", fontWeight: "600", color: "#7A6060",
    letterSpacing: "0.8px", textTransform: "uppercase",
    borderBottom: "2px solid #DFC5EE",
    background: "rgba(193,123,123,0.05)",
    whiteSpace: "nowrap", userSelect: "none",
  });

  const tdStyle = {
    padding: "12px 16px", textAlign: "right",
    fontSize: "14px", color: "#3d2c2c",
    borderBottom: "1px solid #F5EDE8",
    verticalAlign: "middle",
  };

  const inlineInput = (g, i, field, value, extraStyle = {}) => {
    const isEditing = editingCell?.id === (g.id || i) && editingCell?.field === field;
    return isEditing ? (
      <input
        autoFocus
        style={{
          background: "transparent", border: "none", outline: "none",
          borderBottom: "1px solid #B890D0", color: "#3d2c2c", fontSize: "14px",
          fontFamily: "'Heebo', sans-serif", width: "100%", ...extraStyle
        }}
        value={value || ""}
        onChange={e => onUpdateGuest(g.id || i, { [field]: field === "guestCount" ? Number(e.target.value) : e.target.value })}
        onBlur={() => setEditingCell(null)}
      />
    ) : (
      <div
        style={{ cursor: "text", minHeight: "20px", ...extraStyle }}
        onClick={() => setEditingCell({ id: g.id || i, field })}
      >
        {value || "—"}
      </div>
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#FAF7F2",
      zIndex: 9999, display: "flex", flexDirection: "column",
      fontFamily: "'Heebo', sans-serif", direction: language === "he" ? "rtl" : "ltr",
    }}>
      {/* Header Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 32px", borderBottom: "1px solid #E8DDD5",
        background: "rgba(193,123,123,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#3d2c2c" }}>
            👥 {tr.guestListTitle}
          </h1>
          <span style={{ fontSize: "13px", color: "#8B7060" }}>
            {`${language === "he" ? "סה״כ" : "Total"} ${totalGuests} ${tr.guests}`}
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ textAlign: "center", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#4ade80" }}>{totalConfirmed}</div>
            <div style={{ fontSize: "11px", color: "#8B7060" }}>{tr.confirmedCount}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#38bdf8" }}>{totalInvited}</div>
            <div style={{ fontSize: "11px", color: "#8B7060" }}>{tr.invitesSent}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#cf5d9a" }}>{guests.length - totalInvited}</div>
            <div style={{ fontSize: "11px", color: "#8B7060" }}>{tr.invitesNotSent}</div>
          </div>
          <button onClick={exportToExcel} style={{
            padding: "10px 20px", background: "rgba(90,158,111,0.15)",
            border: "1px solid rgba(90,158,111,0.3)", borderRadius: "10px",
            color: "#5A9E6F", cursor: "pointer", fontSize: "14px",
            fontFamily: "'Heebo', sans-serif" }}>
            📥 {tr.exportExcel}
          </button>
          <button onClick={onClose} style={{
            padding: "10px 20px", background: "rgba(255,255,255,0.06)",
            border: "1px solid #E0D5CC", borderRadius: "10px",
            color: "#5A4040", cursor: "pointer", fontSize: "14px",
            fontFamily: "'Heebo', sans-serif" }}>
            ✕ {tr.close}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", padding: "16px 32px", borderBottom: "1px solid #F5EDE8", alignItems: "center", flexWrap: "wrap" }}>
        {[
          ...(guests.some(g => g.invitedBy) ? [
            { key: "all", label: tr.filterAll },
            { key: "bride", label: `👰 ${tr.bride}` },
            { key: "groom", label: `🤵 ${tr.groom}` },
          ] : []),
        ].map(f => (
          <button key={f.key} onClick={() => setFilterBy(f.key)} style={{
            padding: "7px 16px", borderRadius: "20px", cursor: "pointer",
            fontSize: "13px", fontFamily: "'Heebo', sans-serif",
            background: filterBy === f.key ? "#DFC5EE" : "#F5EDE8",
            border: `1px solid ${filterBy === f.key ? "#B890D0" : "#E8DDD5"}`,
            color: filterBy === f.key ? "#8B5A8B" : "#7A6060",
          }}>
            {f.label}
          </button>
        ))}
        <div style={{ marginRight: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#A89080" }}>{tr.sortBy}</span>
          {[
            { key: "name", label: tr.sortAZ },
            ...(guests.some(g => g.invitedBy) ? [{ key: "invitedBy", label: tr.sortInvitedBy }] : []),
            { key: "rsvpStatus", label: tr.sortStatus },
            { key: "invitationSent", label: tr.sortInvite },
          ].map(s => (
            <button key={s.key} onClick={() => handleSort(s.key)} style={{
              padding: "7px 14px", borderRadius: "20px", cursor: "pointer",
              fontSize: "13px", fontFamily: "'Heebo', sans-serif",
              background: sortBy === s.key ? "rgba(56,189,248,0.2)" : "#F5EDE8",
              border: `1px solid ${sortBy === s.key ? "rgba(56,189,248,0.4)" : "#E8DDD5"}`,
              color: sortBy === s.key ? "#38bdf8" : "#7A6060",
            }}>
              {s.label} {sortBy === s.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr>
              <th style={thStyle("name")} onClick={() => handleSort("name")}>
                <SortArrow field="name" />{tr.colName}
              </th>
              {guests.some(g => g.invitedBy) && (
                <th style={thStyle("invitedBy")} onClick={() => handleSort("invitedBy")}>
                  <SortArrow field="invitedBy" />{tr.colInvitedBy}
                </th>
              )}
              <th style={thStyle("guestCount")} onClick={() => handleSort("guestCount")}>
                <SortArrow field="guestCount" />{tr.colCount}
              </th>
              <th style={thStyle("phone")}>{tr.colPhone}</th>
              <th style={{ ...thStyle("invitationSent"), textAlign: "center" }}>{tr.colInviteSent}</th>
              <th style={{ ...thStyle("rsvpConfirmed"), textAlign: "center" }}>{tr.colRSVP}</th>
              <th style={{ ...thStyle("rsvpCount"), textAlign: "center" }}>{tr.colAttending}</th>
              <th style={thStyle("")}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, i) => (
              <tr key={g.id || i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>

                {/* Name + note — click to edit */}
                <td style={tdStyle}>
                  {inlineInput(g, i, "name", g.name, { fontWeight: "600" })}
                </td>

                {/* Invited by */}
                {guests.some(g => g.invitedBy) && (
                  <td style={tdStyle}>
                    {g.invitedBy ? (
                      <span style={{
                        fontSize: "12px", padding: "3px 10px", borderRadius: "12px",
                        background: g.invitedBy === "כלה" ? "rgba(192,132,252,0.15)" : "rgba(56,189,248,0.15)",
                        color: g.invitedBy === "כלה" ? "#8B5A8B" : "#38bdf8",
                        border: `1px solid ${g.invitedBy === "כלה" ? "rgba(192,132,252,0.3)" : "rgba(56,189,248,0.3)"}`,
                      }}>
                        {g.invitedBy === "כלה" ? "👰" : "🤵"} {g.invitedBy === "כלה" ? tr.bride : tr.groom}
                      </span>
                    ) : "—"}
                  </td>
                )}

                {/* Guest count — click to edit */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {inlineInput(g, i, "guestCount", g.guestCount || 1, { textAlign: "center", width: "40px", direction: "ltr" })}
                </td>

                {/* Phone — click to edit */}
                <td style={tdStyle}>
                  {inlineInput(g, i, "phone", g.phone, { direction: "ltr" })}
                </td>

                {/* Invite sent toggle */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button onClick={() => onUpdateGuest(g.id || i, { invitationSent: !g.invitationSent })} style={{
                    width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", border: "none",
                    background: g.invitationSent ? "rgba(74,222,128,0.2)" : "#F5EDE8",
                    fontSize: "16px",
                  }}>
                    {g.invitationSent ? "✅" : "⬜"}
                  </button>
                </td>

                {/* RSVP buttons */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                    {[
                      { key: "confirmed", label: tr.coming, color: "#4ade80", bg: "rgba(74,222,128,0.25)" },
                      { key: "declined", label: tr.notComing, color: "#f87171", bg: "rgba(248,113,113,0.25)" },
                      { key: "no_answer", label: tr.noAnswer, color: "#fb923c", bg: "rgba(251,146,60,0.25)" },
                    ].map(btn => (
                      <button key={btn.key}
                        onClick={() => onUpdateGuest(g.id || i, { rsvpStatus: g.rsvpStatus === btn.key ? null : btn.key })}
                        style={{
                          padding: "4px 10px", borderRadius: "8px", cursor: "pointer", border: "none",
                          background: g.rsvpStatus === btn.key ? btn.bg : "#F5EDE8",
                          color: g.rsvpStatus === btn.key ? btn.color : "#8B7060",
                          fontSize: "12px", fontFamily: "'Heebo', sans-serif",
                          outline: g.rsvpStatus === btn.key ? `1px solid ${btn.color}` : "none",
                        }}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </td>

                {/* Attending count */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {g.rsvpStatus === "confirmed" ? (
                    <select
                      value={g.rsvpCount || g.guestCount || 1}
                      onChange={(e) => onUpdateGuest(g.id || i, { rsvpCount: Number(e.target.value) })}
                      style={{
                        background: "rgba(255,255,255,0.06)", border: "1px solid #E0D5CC",
                        borderRadius: "8px", color: "#3d2c2c", padding: "4px 8px",
                        fontFamily: "'Heebo', sans-serif", fontSize: "14px", cursor: "pointer",
                      }}>
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  ) : "—"}
                </td>

                {/* Delete */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button
                    onClick={() => {
                      if (window.confirm(language === "he"
                        ? `האם בטוח שברצונך למחוק את ${g.name} מרשימת המוזמנים?`
                        : `Are you sure you want to remove ${g.name} from the guest list?`
                      )) {
                        onRemoveGuest(g.id || i);
                      }
                    }}
                    style={{
                      background: "none", border: "none", color: "#6B5B5B",
                      cursor: "pointer", fontSize: "18px", padding: "0", lineHeight: 1,
                    }}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.2)", fontSize: "16px" }}>
            {tr.noGuestsDisplay}
          </div>
        )}
      </div>
    </div>
  );
}