"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import styles from "./AuthForm.module.css";

interface AuthFormProps {
  onSuccess?: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("password", {
        email,
        password,
        flow,
      });
      console.log("Sign in result:", result);
      // signIn doesn't throw on success, check if we got a redirect or success
      if (result?.signingIn === false) {
        // This means auth failed
        setError(
          flow === "signIn"
            ? "Invalid email or password"
            : "Could not create account. Email may already be in use."
        );
      } else {
        // Success - close modal
        onSuccess?.();
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const errorMessage = err?.message || err?.toString() || "";
      
      // Map technical errors to user-friendly messages
      if (errorMessage.includes("InvalidSecret") || errorMessage.includes("Invalid")) {
        setError(flow === "signIn" 
          ? "Invalid email or password. Please try again."
          : "Could not create account. Please check your details."
        );
      } else if (errorMessage.includes("not found") || errorMessage.includes("NotFound")) {
        setError("Account not found. Please check your email or sign up.");
      } else if (errorMessage.includes("already exists") || errorMessage.includes("AlreadyExists")) {
        setError("An account with this email already exists. Please sign in.");
      } else if (errorMessage.includes("network") || errorMessage.includes("Network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(flow === "signIn"
          ? "Unable to sign in. Please try again."
          : "Unable to create account. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>
          {flow === "signIn" ? "Sign In" : "Create Account"}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : flow === "signIn"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <div className={styles.switchFlow}>
          <span className={styles.switchText}>
            {flow === "signIn"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>
          <button
            type="button"
            className={styles.switchButton}
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError("");
            }}
          >
            {flow === "signIn" ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
