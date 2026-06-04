import { useState } from "react";

export default function BudgetTable({ expenses, providers, budget, onClose, onUpdateProvider, onUpdateExpense, language }) {
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterBy, setFilterBy] = useState("all");

  const isHe = language === "he";

  const allItems = [
    ...providers.map(p => ({
      ...p,
      isProvider: true,
      agreedPrice: p.totalPrice || 0,
      paidAmount: p.paymentStatus === "paid" ? (p.totalPrice || 0)
        : p.paymentStatus === "deposit" ? (p.depositAmount || 0) : 0,
    })),
    ...expenses.filter(e => !e.providerId).map(e => {
      const status = e.paymentStatus || "paid";
      const paid = status === "paid"
        ? (e.amount || 0)
        : status === "deposit"
        ? (e.depositAmount || 0)
        : 0;
      return {
        ...e,
        isProvider: false,
        agreedPrice: e.amount || 0,
        paidAmount: paid,
        paymentStatus: status,
      };
    }),
  ];

  const filtered = allItems.filter(item => {
    if (filterBy === "all") return true;
    if (filterBy === "paid") return item.paymentStatus === "paid";
    if (filterBy === "deposit") return item.paymentStatus === "deposit";
    if (filterBy === "unpaid") return item.paymentStatus === "unpaid" || !item.paymentStatus;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortBy] || "";
    let valB = b[sortBy] || "";
    if (sortBy === "agreedPrice" || sortBy === "paidAmount") {
      valA = Number(valA); valB = Number(valB);
      return sortDir === "asc" ? valA - valB : valB - valA;
    }
    const result = String(valA).localeCompare(String(valB), "he");
    return sortDir === "asc" ? result : -result;
  });

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const totalAgreed = allItems.reduce((sum, i) => sum + i.agreedPrice, 0);
  const totalPaid = allItems.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalRemaining = totalAgreed - totalPaid;
  const budgetRemaining = (budget.total || 0) - totalAgreed;

  const thStyle = {
    padding: "12px 16px", textAlign: "right",
    fontSize: "12px", fontWeight: "600", color: "#7A6060",
    letterSpacing: "0.8px", textTransform: "uppercase",
    borderBottom: "2px solid #DFC5EE",
    background: "rgba(193,123,123,0.05)",
    whiteSpace: "nowrap", userSelect: "none", cursor: "pointer",
  };

  const tdStyle = {
    padding: "12px 16px", textAlign: "right",
    fontSize: "14px", color: "#3d2c2c",
    borderBottom: "1px solid #F5EDE8",
    verticalAlign: "middle",
  };

  const SortArrow = ({ field }) => (
    <span style={{ marginRight: "4px", opacity: sortBy === field ? 1 : 0.3 }}>
      {sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const statusLabel = (item) => {
    if (item.paymentStatus === "paid") return { text: isHe ? "שולם" : "Paid", color: "#5A9E6F", bg: "rgba(74,222,128,0.15)" };
    if (item.paymentStatus === "deposit") return { text: isHe ? "מקדמה" : "Deposit", color: "#fb923c", bg: "rgba(251,146,60,0.15)" };
    return { text: isHe ? "לא שולם" : "Unpaid", color: "#f87171", bg: "rgba(248,113,113,0.15)" };
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#FAF7F2",
      zIndex: 9999, display: "flex", flexDirection: "column",
      fontFamily: "'Heebo', sans-serif", direction: isHe ? "rtl" : "ltr",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 32px", borderBottom: "1px solid #E8DDD5",
        background: "rgba(193,123,123,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: "#3d2c2c" }}>
            💰 {isHe ? "פירוט תקציב" : "Budget Details"}
          </h1>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ textAlign: "center", background: "#F5EDE8", border: "1px solid #E0D5CC", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#3d2c2c" }}>₪{totalAgreed.toLocaleString()}</div>
            <div style={{ fontSize: "11px", color: "#8B7060" }}>{isHe ? "סה״כ הוזמן" : "Total Ordered"}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(90,158,111,0.1)", border: "1px solid rgba(90,158,111,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#5A9E6F" }}>₪{totalPaid.toLocaleString()}</div>
            <div style={{ fontSize: "11px", color: "#8B7060" }}>{isHe ? "שולם" : "Paid"}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#f87171" }}>₪{totalRemaining.toLocaleString()}</div>
            <div style={{ fontSize: "11px", color: "#8B7060" }}>{isHe ? "נותר לשלם לאחר האירוע" : "Remaining After Event"}</div>
          </div>
          <div style={{ textAlign: "center", background: budgetRemaining >= 0 ? "rgba(251,146,60,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${budgetRemaining >= 0 ? "rgba(251,146,60,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: "10px", padding: "8px 16px" }}>
            <div style={{ fontSize: "18px", fontWeight: "700", color: budgetRemaining >= 0 ? "#fb923c" : "#f87171" }}>
              ₪{budgetRemaining.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#8B7060" }}>{isHe ? "נותר מהתקציב" : "Budget Remaining"}</div>
          </div>
          <button onClick={onClose} style={{
            padding: "10px 20px", background: "#F2EBE1",
            border: "1px solid #E0D5CC", borderRadius: "10px",
            color: "#5A4040", cursor: "pointer", fontSize: "14px",
            fontFamily: "'Heebo', sans-serif",
          }}>
            ✕ {isHe ? "סגור" : "Close"}
          </button>
        </div>
      </div>

      {/* Filters + Sort */}
      <div style={{ display: "flex", gap: "8px", padding: "16px 32px", borderBottom: "1px solid #F5EDE8", alignItems: "center", flexWrap: "wrap" }}>
        {[
          { key: "all", label: isHe ? "הכל" : "All" },
          { key: "paid", label: isHe ? "שולם" : "Paid" },
          { key: "deposit", label: isHe ? "מקדמה" : "Deposit" },
          { key: "unpaid", label: isHe ? "לא שולם" : "Unpaid" },
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
          <span style={{ fontSize: "12px", color: "#A89080" }}>
            {isHe ? "מיין לפי:" : "Sort by:"}
          </span>
          {[
            { key: "name", label: isHe ? "א-ב" : "A-Z" },
            { key: "agreedPrice", label: isHe ? "מחיר" : "Price" },
            { key: "paymentStatus", label: isHe ? "סטטוס" : "Status" },
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

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort("name")}>
                <SortArrow field="name" />{isHe ? "שם" : "Name"}
              </th>
              <th style={thStyle}>{isHe ? "סוג" : "Type"}</th>
              <th style={thStyle} onClick={() => handleSort("agreedPrice")}>
                <SortArrow field="agreedPrice" />{isHe ? "מחיר מוסכם" : "Agreed Price"}
              </th>
              <th style={thStyle}>{isHe ? "שולם" : "Paid"}</th>
              <th style={thStyle}>{isHe ? "נותר לשלם" : "Remaining"}</th>
              <th style={{ ...thStyle, textAlign: "center" }}>{isHe ? "סטטוס" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => {
              const status = statusLabel(item);
              const remaining = item.agreedPrice - item.paidAmount;
              return (
                <tr key={item.id || i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: "600" }}>{item.name}</div>
                    {item.note && <div style={{ fontSize: "11px", color: "#A89080", marginTop: "2px" }}>{item.note}</div>}
                  </td>
                  <td style={tdStyle}>
                    {item.isProvider
                      ? <span style={{ color: "#38bdf8", fontSize: "12px" }}>{item.serviceType || "—"}</span>
                      : <span style={{ color: "#8B7060", fontSize: "12px" }}>{isHe ? "הוצאה" : "Expense"}</span>
                    }
                  </td>
                  <td style={tdStyle}>₪{item.agreedPrice.toLocaleString()}</td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      value={item.paidAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (item.isProvider) {
                          const newStatus = val >= item.agreedPrice ? "paid" : val > 0 ? "deposit" : "unpaid";
                          onUpdateProvider(item.id, {
                            paymentStatus: newStatus,
                            depositAmount: val,
                          });
                        } else {
                          const newStatus = val >= item.agreedPrice ? "paid" : val > 0 ? "deposit" : "unpaid";
                          onUpdateExpense(item.id, {
                            paymentStatus: newStatus,
                            depositAmount: val,
                          });
                        }
                      }}
                      style={{
                        background: "#F2EBE1", border: "1px solid #E0D5CC",
                        borderRadius: "8px", color: "#5A9E6F", padding: "6px 10px",
                        fontFamily: "'Heebo', sans-serif", fontSize: "14px", width: "100px",
                      }}
                    />
                  </td>
                  <td style={{ ...tdStyle, color: remaining > 0 ? "#f87171" : "#4ade80" }}>
                    {remaining > 0 ? `₪${remaining.toLocaleString()}` : "✅"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{
                      padding: "4px 12px", borderRadius: "12px", fontSize: "12px",
                      background: status.bg, color: status.color,
                    }}>
                      {status.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.2)", fontSize: "16px" }}>
            {isHe ? "אין פריטים להצגה" : "No items to display"}
          </div>
        )}
      </div>
    </div>
  );
}