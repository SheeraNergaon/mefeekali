// ── App Entry Point ─────────────────────────────────────────────────────────
// This file is responsible for "starting" the application.
// It takes the root App component and connects it to index.html (<div id="root">).
// React.StrictMode helps catch potential issues during development.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
