// This file handles all user authentication for MefeeKali.
// It supports two sign-in methods: Email/Password and Google Sign-In.

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/config";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#FAF7F2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Heebo', sans-serif",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  bgCircle1: {
    position: "absolute",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(193,123,123,0.12) 0%, transparent 70%)",
    top: "-200px",
    right: "-100px",
    pointerEvents: "none",
  },
  bgCircle2: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
    bottom: "-100px",
    left: "-100px",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#FDF9F5",
    border: "1px solid #E8DDD5",
    borderRadius: "24px",
    padding: "48px 40px",
    position: "relative",
    zIndex: 1,
    boxShadow: "0 4px 24px rgba(193,123,123,0.08)",
  },
  logo: {
    textAlign: "center",
    marginBottom: "36px",
  },
  logoEmoji: {
    fontSize: "36px",
    display: "block",
    marginBottom: "12px",
    fontFamily: "serif",
  },
  logoTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#3d2c2c",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  logoSub: {
    fontSize: "14px",
    color: "#A89080",
    margin: 0,
    letterSpacing: "0.3px",
  },
  tabs: {
    display: "flex",
    background: "#F5EDE8",
    borderRadius: "12px",
    padding: "4px",
    marginBottom: "28px",
  },
  tab: (active) => ({
    flex: 1,
    padding: "10px",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    background: active ? "#cda0df" : "transparent",
    color: active ? "#ffffff" : "#8B7060",
    fontFamily: "'Heebo', sans-serif",
  }),
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "500",
    color: "#8B7060",
    marginBottom: "8px",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    background: "#F5EDE8",
    border: "1px solid #E8DDD5",
    borderRadius: "12px",
    color: "#3d2c2c",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'Heebo', sans-serif",
    transition: "border-color 0.2s ease",
  },
  primaryBtn: {
    width: "100%",
    padding: "15px",
    background: "#cda0df",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
    letterSpacing: "0.3px",
    marginTop: "8px",
    transition: "opacity 0.2s ease",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#E8DDD5",
  },
  dividerText: {
    fontSize: "12px",
    color: "#A89080",
    letterSpacing: "0.5px",
  },
  googleBtn: {
    width: "100%",
    padding: "14px",
    background: "#F5EDE8",
    border: "1px solid #E8DDD5",
    borderRadius: "12px",
    color: "#5A4040",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "background 0.2s ease",
  },
  errorBox: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "10px",
    padding: "12px 14px",
    color: "#c0504a",
    fontSize: "13px",
    marginTop: "14px",
    lineHeight: "1.5",
  },
  welcomeCard: {
    textAlign: "center",
    padding: "20px 0",
  },
  welcomeEmoji: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
  },
  welcomeTitle: {
    fontSize: "22px",
    color: "#3d2c2c",
    margin: "0 0 8px",
    fontWeight: "600",
  },
  welcomeEmail: {
    fontSize: "14px",
    color: "#A89080",
    margin: "0 0 32px",
  },
  logoutBtn: {
    padding: "13px 32px",
    background: "#F5EDE8",
    border: "1px solid #E8DDD5",
    borderRadius: "12px",
    color: "#7A6060",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "'Heebo', sans-serif",
  },
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.5 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.3C9.6 35.7 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C41.3 36.1 44 30.4 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Request Google Calendar access scope so users can add meetings
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar.events");

  const handleEmailAuth = async () => {
    setLoading(true);
    setError("");
    try {
      const fn =
        mode === "signup"
          ? createUserWithEmailAndPassword
          : signInWithEmailAndPassword;
      const credential = await fn(auth, email, password);
      setUser(credential.user);
      onLogin(credential.user);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("email-already-in-use")) setError("This email is already registered. Try logging in.");
      else if (msg.includes("wrong-password") || msg.includes("invalid-credential")) setError("Incorrect email or password.");
      else if (msg.includes("weak-password")) setError("Password must be at least 6 characters.");
      else if (msg.includes("invalid-email")) setError("Please enter a valid email address.");
      else setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || result._tokenResponse?.oauthAccessToken;
      setUser(result.user);
      onLogin(result.user, accessToken);
    } catch (err) {
      if (!err.message.includes("popup-closed")) {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setEmail("");
    setPassword("");
  };

  if (user) {
    return (
      <div style={styles.page}>
        <div style={styles.bgCircle1} />
        <div style={styles.bgCircle2} />
        <div style={styles.card}>
          <div style={styles.welcomeCard}>
            <span style={styles.welcomeEmoji}>ðŸŽ‰</span>
            <h2 style={styles.welcomeTitle}>
              Welcome, {user.displayName || "Event Planner"}!
            </h2>
            <p style={styles.welcomeEmail}>{user.email}</p>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />
      <div style={styles.card}>
      <div style={styles.logo}>
        <img src="/mefeekali-logo.svg" alt="MefeeKali" style={{ width: "200px", height: "auto", marginBottom: "8px" }} />
        <p style={styles.logoSub}>Your personal event producer</p>
      </div>

        <div style={styles.tabs}>
          <button style={styles.tab(mode === "login")} onClick={() => { setMode("login"); setError(""); }}>
            Log in
          </button>
          <button style={styles.tab(mode === "signup")} onClick={() => { setMode("signup"); setError(""); }}>
            Sign up
          </button>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
          />
        </div>

        <button
          style={{ ...styles.primaryBtn, opacity: loading ? 0.6 : 1 }}
          onClick={handleEmailAuth}
          disabled={loading}
        >
          {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
        </button>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <button style={styles.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
          <GoogleIcon />
          Continue with Google
        </button>

        {error && <div style={styles.errorBox}>{error}</div>}
      </div>
    </div>
  );
}

export default Auth;
