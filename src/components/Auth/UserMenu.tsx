"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import styles from "./UserMenu.module.css";
import AuthForm from "./AuthForm";
import { api } from "../../../convex/_generated/api";

interface UserMenuProps {
  onAuthSuccess?: () => void;
}

export default function UserMenu({ onAuthSuccess }: UserMenuProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    onAuthSuccess?.();
  };

  if (isLoading) {
    return <div className={styles.loading}>...</div>;
  }

  if (!isAuthenticated) {
    return (
      <>
        <button 
          onClick={() => setShowAuthModal(true)} 
          className={styles.loginButton}
        >
          <span className={styles.loginIcon}>✨</span>
          <span>Login</span>
        </button>
        {showAuthModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAuthModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button 
                className={styles.modalClose} 
                onClick={() => setShowAuthModal(false)}
              >
                ✕
              </button>
              <AuthForm onSuccess={handleAuthSuccess} />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={styles.container}>
      <button onClick={() => signOut()} className={styles.signOutButton}>
        <span className={styles.userIcon}>👤</span>
        <span className={styles.signOutText}>Sign Out</span>
      </button>
    </div>
  );
}
