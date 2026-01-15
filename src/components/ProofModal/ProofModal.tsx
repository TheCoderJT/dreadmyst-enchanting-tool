"use client";

import { useEffect } from "react";
import styles from "./ProofModal.module.css";

interface ProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  itemName: string;
  finalLevel: number;
}

export default function ProofModal({
  isOpen,
  onClose,
  imageUrl,
  itemName,
  finalLevel,
}: ProofModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
        
        <div className={styles.header}>
          <span className={styles.verifiedBadge}>✓ Verified</span>
          <h3 className={styles.title}>{itemName}</h3>
          <span className={styles.level}>+{finalLevel}</span>
        </div>

        <div className={styles.imageContainer}>
          <img
            src={imageUrl}
            alt={`Proof screenshot for ${itemName} +${finalLevel}`}
            className={styles.image}
          />
        </div>

        <p className={styles.caption}>
          Screenshot verified by AI analysis
        </p>
      </div>
    </div>
  );
}
