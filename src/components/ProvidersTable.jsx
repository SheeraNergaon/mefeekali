import { useState } from "react";
import { translations } from "../translations";

export default function ProvidersTable({ providers, onClose, onEditProvider, language }) {
  const tr = translations[language];
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const splitName = (fullName = "") => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return { firstName: "—", lastName: "—" };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "—" };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const sorted = [...providers].sort((a, b) => {
    const nameA = splitName(a.name || "");
    const nameB = splitName(b.name || "");

    let valA = "";
    let valB = "";

    if (sortBy === "firstName") {
      valA = nameA.firstName;
      valB = nameB.firstName;
    } else if (sortBy === "lastName") {
      valA = nameA.lastName;
      valB = nameB.lastName;
    } else {
      valA = a[sortBy] || "";
      valB = b[sortBy] || "";
    }

    const result = String(valA).localeCompare(String(valB), language === "he" ? "he" : "en");
    return sortDir === "asc" ? result : -result;
  });

  const SortArrow = ({ field }) => (
    <span style={{ marginRight: "4px", opacity: sortBy === field ? 1 : 0.3 }}>
      {sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const thStyle = (field) => ({
    padding: "12px 16px",
    textAlign: "right",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    color: "#7A6060",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    borderBottom: "2px solid #DFC5EE",
    background: "rgba(193,123,123,0.05)",
    whiteSpace: "nowrap",
    userSelect: "none",
  });

  const tdStyle = {
    padding: "12px 16px",
    textAlign: "right",
    fontSize: "14px",
    color: "#3d2c2c",
    borderBottom: "1px solid #F5EDE8",
    verticalAlign: "middle",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FAF7F2",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Heebo', sans-serif",
        direction: language === "he" ? "rtl" : "ltr",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          borderBottom: "1px solid #E8DDD5",
          background: "rgba(193,123,123,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#3d2c2c" }}>
            🏢 {tr.providerListTitle}
          </h1>

          <span style={{ fontSize: "13px", color: "#8B7060" }}>
            {providers.length} {tr.added}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: "10px 20px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid #E0D5CC",
            borderRadius: "10px",
            color: "#5A4040",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "'Heebo', sans-serif",
          }}
        >
          ✕ {tr.close}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr>
              <th style={thStyle("firstName")} onClick={() => handleSort("firstName")}>
                <SortArrow field="firstName" /> {tr.firstName}
              </th>

              <th style={thStyle("lastName")} onClick={() => handleSort("lastName")}>
                <SortArrow field="lastName" /> {tr.lastName}
              </th>

              <th style={thStyle("serviceType")} onClick={() => handleSort("serviceType")}>
                <SortArrow field="serviceType" /> {tr.serviceType}
              </th>

              <th
                style={{
                    ...thStyle("phone"),
                    cursor: "default",
                }}
              >
                {tr.phone}
              </th>

              <th style={thStyle("email")} onClick={() => handleSort("email")}>
                <SortArrow field="email" /> {tr.email}
              </th>

              <th style={{ ...thStyle(""), cursor: "default" }}></th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...tdStyle, textAlign: "center", color: "#A89080", padding: "32px" }}>
                  {tr.noProvidersDisplay}
                </td>
              </tr>
            ) : (
              sorted.map((p, i) => {
                const { firstName, lastName } = splitName(p.name || "");

                return (
                  <tr
                    key={p.id || i}
                    style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: "600" }}>{firstName}</div>
                    </td>

                    <td style={tdStyle}>{lastName}</td>

                    <td style={tdStyle}>
                      {p.serviceType ? (
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            background: "rgba(56,189,248,0.15)",
                            color: "#38bdf8",
                            border: "1px solid rgba(56,189,248,0.3)",
                          }}
                        >
                          {p.serviceType}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={tdStyle}>
                      <span dir="ltr">{p.phone || "—"}</span>
                    </td>

                    <td style={tdStyle}>
                      <span style={{ wordBreak: "break-word" }}>{p.email || "—"}</span>
                    </td>

                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <button
                        onClick={() => onEditProvider(p)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "16px",
                        }}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}