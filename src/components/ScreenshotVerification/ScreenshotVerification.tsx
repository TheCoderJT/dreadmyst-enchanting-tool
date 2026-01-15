"use client";

import { useState, useRef } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import styles from "./ScreenshotVerification.module.css";

const MAX_WIDTH = 400;
const MAX_HEIGHT = 400;
const QUALITY = 0.5;
const MAX_FILE_SIZE = 100 * 1024; // 100KB target

// Known editing software signatures to detect in EXIF metadata
const EDITING_SOFTWARE_SIGNATURES = [
  'photoshop',
  'adobe',
  'gimp',
  'paint.net',
  'pixlr',
  'canva',
  'affinity',
  'corel',
  'paintshop',
  'lightroom',
  'capture one',
  'snapseed',
  'picmonkey',
  'fotor',
  'befunky',
  'polarr',
  'luminar',
  'darktable',
  'rawtherapee',
  'acdsee',
  'photoscape',
  'irfanview',
  'xnview',
  'faststone',
];

// Check EXIF metadata for editing software signatures
async function checkForEditingSoftware(file: File): Promise<{ edited: boolean; software: string | null }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target?.result as ArrayBuffer);
        
        // Check for JPEG
        if (view.getUint16(0) !== 0xFFD8) {
          resolve({ edited: false, software: null });
          return;
        }
        
        let offset = 2;
        const length = view.byteLength;
        
        while (offset < length) {
          if (view.getUint8(offset) !== 0xFF) {
            offset++;
            continue;
          }
          
          const marker = view.getUint8(offset + 1);
          
          // APP1 marker (EXIF)
          if (marker === 0xE1) {
            const segmentLength = view.getUint16(offset + 2);
            const exifData = new Uint8Array(e.target?.result as ArrayBuffer, offset + 4, segmentLength - 2);
            const exifString = new TextDecoder('utf-8', { fatal: false }).decode(exifData).toLowerCase();
            
            // Check for editing software signatures
            for (const signature of EDITING_SOFTWARE_SIGNATURES) {
              if (exifString.includes(signature)) {
                resolve({ edited: true, software: signature });
                return;
              }
            }
          }
          
          // APP0 marker (JFIF) or other APP markers
          if (marker >= 0xE0 && marker <= 0xEF) {
            const segmentLength = view.getUint16(offset + 2);
            const segmentData = new Uint8Array(e.target?.result as ArrayBuffer, offset + 4, Math.min(segmentLength - 2, 500));
            const segmentString = new TextDecoder('utf-8', { fatal: false }).decode(segmentData).toLowerCase();
            
            for (const signature of EDITING_SOFTWARE_SIGNATURES) {
              if (segmentString.includes(signature)) {
                resolve({ edited: true, software: signature });
                return;
              }
            }
            
            offset += 2 + segmentLength;
          } else if (marker === 0xD9 || marker === 0xDA) {
            // End of image or start of scan
            break;
          } else {
            offset += 2;
          }
        }
        
        resolve({ edited: false, software: null });
      } catch {
        resolve({ edited: false, software: null });
      }
    };
    
    reader.onerror = () => resolve({ edited: false, software: null });
    reader.readAsArrayBuffer(file.slice(0, 65536)); // Read first 64KB for metadata
  });
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = (width * MAX_HEIGHT) / height;
        height = MAX_HEIGHT;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively reduce quality until under MAX_FILE_SIZE
      let quality = QUALITY;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not compress image"));
              return;
            }

            if (blob.size > MAX_FILE_SIZE && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
            } else {
              resolve(blob);
            }
          },
          "image/jpeg",
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => reject(new Error("Could not load image"));
    img.src = URL.createObjectURL(file);
  });
}

interface ScreenshotVerificationProps {
  completedItemId: Id<"completedItems">;
  itemName: string;
  finalLevel: number;
  isVerified?: boolean;
  onVerificationComplete?: (verified: boolean) => void;
}

export default function ScreenshotVerification({
  completedItemId,
  itemName,
  finalLevel,
  isVerified,
  onVerificationComplete,
}: ScreenshotVerificationProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    verified: boolean;
    details?: {
      extractedName: string | null;
      extractedLevel: number | null;
      confidence: string;
      notes: string;
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.verification.generateUploadUrl);
  const verifyScreenshot = useAction(api.verification.verifyScreenshot);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be less than 10MB");
      return;
    }

    // Check for editing software signatures in metadata
    const editCheck = await checkForEditingSoftware(file);
    if (editCheck.edited) {
      setError(`Image appears to have been edited with ${editCheck.software}. Please upload an unedited screenshot.`);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Compress the image before upload
      const compressedBlob = await compressImage(file);
      
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      
      // Upload to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressedBlob.type },
        body: compressedBlob,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }
      
      const { storageId } = await uploadResponse.json();
      
      setIsUploading(false);
      setIsVerifying(true);
      
      // Verify the screenshot
      const verificationResult = await verifyScreenshot({
        completedItemId,
        storageId,
      });
      
      if (!verificationResult.success) {
        setError(verificationResult.error || "Verification failed");
        setResult(null);
      } else {
        setResult({
          verified: verificationResult.verified,
          details: verificationResult.details,
        });
        onVerificationComplete?.(verificationResult.verified);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsUploading(false);
      setIsVerifying(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Already verified
  if (isVerified) {
    return (
      <div className={styles.verifiedBadge}>
        <span className={styles.verifiedIcon}>✓</span>
        <span className={styles.verifiedText}>Verified</span>
      </div>
    );
  }

  // Show result after verification attempt
  if (result) {
    return (
      <div className={styles.resultContainer}>
        {result.verified ? (
          <div className={styles.successResult}>
            <span className={styles.successIcon}>✓</span>
            <div className={styles.resultContent}>
              <span className={styles.resultTitle}>Verified!</span>
              <span className={styles.resultNote}>{result.details?.notes}</span>
            </div>
          </div>
        ) : (
          <div className={styles.failedResult}>
            <span className={styles.failedIcon}>✗</span>
            <div className={styles.resultContent}>
              <span className={styles.resultTitle}>Verification Failed</span>
              <span className={styles.resultNote}>{result.details?.notes}</span>
              {result.details?.extractedLevel !== null && result.details && (
                <div className={styles.extractedInfo}>
                  <span>AI detected: +{result.details.extractedLevel}</span>
                  <span>Expected: +{finalLevel}</span>
                </div>
              )}
              <button
                onClick={() => setResult(null)}
                className={styles.retryButton}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className={styles.fileInput}
        disabled={isUploading || isVerifying}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className={styles.uploadButton}
        disabled={isUploading || isVerifying}
      >
        {isUploading ? (
          <>
            <span className={styles.spinner} />
            Uploading...
          </>
        ) : isVerifying ? (
          <>
            <span className={styles.spinner} />
            Verifying...
          </>
        ) : (
          <>
            <span className={styles.cameraIcon}>📷</span>
            Verify with Screenshot
          </>
        )}
      </button>

      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.helpText}>
        Upload a screenshot showing {itemName} at +{finalLevel} to earn a verified badge
      </p>
    </div>
  );
}
