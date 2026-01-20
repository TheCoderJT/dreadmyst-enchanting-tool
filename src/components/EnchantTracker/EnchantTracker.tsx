"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ColorDropdown from "@/components/ColorDropdown";
import ScreenshotVerification from "@/components/ScreenshotVerification/ScreenshotVerification";
import ProofModal from "@/components/ProofModal/ProofModal";
import OrbBreakdownModal from "@/components/OrbBreakdownModal/OrbBreakdownModal";
import {
  ItemQuality,
  OrbQuality,
  ITEM_QUALITY_NAMES,
  ORB_QUALITY_NAMES,
  ITEM_QUALITY_COLORS,
  ORB_QUALITY_COLORS,
  MAX_ENCHANT,
  enchantSuccessRate,
} from "@/lib/enchant-engine";
import styles from "./EnchantTracker.module.css";

const ORB_TYPES = ["minor", "lesser", "greater", "major", "divine"] as const;
type OrbType = typeof ORB_TYPES[number];

export default function EnchantTracker() {
  const [itemName, setItemName] = useState("");
  const [itemQuality, setItemQuality] = useState<ItemQuality>(ItemQuality.Godly);
  const [selectedOrb, setSelectedOrb] = useState<OrbType>("divine");
  const [orbInventory, setOrbInventory] = useState({
    minor: 0,
    lesser: 0,
    greater: 0,
    major: 0,
    divine: 0,
  });
  const [orbInventoryInitialized, setOrbInventoryInitialized] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [proofModal, setProofModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    itemName: string;
    finalLevel: number;
  }>({ isOpen: false, imageUrl: "", itemName: "", finalLevel: 0 });
  const [orbModal, setOrbModal] = useState<{
    isOpen: boolean;
    itemName: string;
    finalLevel: number;
    totalAttempts: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: number;
    orbsUsedByType: {
      minor: number;
      lesser: number;
      greater: number;
      major: number;
      divine: number;
    } | null;
  }>({ isOpen: false, itemName: "", finalLevel: 0, totalAttempts: 0, totalSuccesses: 0, totalFailures: 0, successRate: 0, orbsUsedByType: null });
  
  // Completed items filtering/sorting state
  const [completedSearch, setCompletedSearch] = useState("");
  const [completedSort, setCompletedSort] = useState<"newest" | "oldest" | "orbs" | "rarity" | "success">("newest");
  const [completedDisplayLimit, setCompletedDisplayLimit] = useState(15);
  const [verifyingItem, setVerifyingItem] = useState<{
    id: string;
    itemName: string;
    finalLevel: number;
  } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const activeSession = useQuery(api.sessions.getActiveSession);
  const userProfile = useQuery(api.sessions.getUserProfile);
  // OPTIMIZED: Server-side pagination - fetch only what we need
  const completedSessionsData = useQuery(api.sessions.getUserCompletedSessions, { limit: completedDisplayLimit });
  const completedSessions = completedSessionsData?.items;
  const hasMoreCompleted = completedSessionsData?.hasMore ?? false;
  const itemValidation = useQuery(api.validation.validateItemName, 
    itemName.trim() ? { itemName: itemName.trim() } : "skip"
  );
  const itemSuggestions = useQuery(api.validation.suggestItemNames,
    itemName.trim().length >= 2 ? { partialName: itemName.trim(), limit: 8 } : "skip"
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-detect rarity from item name and sync with dropdown
  useEffect(() => {
    const nameLower = itemName.toLowerCase();
    const rarityMap: Record<string, ItemQuality> = {
      'white': ItemQuality.White,
      'radiant': ItemQuality.Radiant,
      'blessed': ItemQuality.Blessed,
      'holy': ItemQuality.Holy,
      'godly': ItemQuality.Godly,
    };
    
    for (const [rarityName, quality] of Object.entries(rarityMap)) {
      if (nameLower.startsWith(rarityName + ' ') || nameLower.includes(' ' + rarityName + ' ')) {
        setItemQuality(quality);
        break;
      }
    }
  }, [itemName]);
  
  const startSession = useMutation(api.sessions.startSession);
  const logAttempt = useMutation(api.sessions.logAttempt);
  const abandonSession = useMutation(api.sessions.abandonSession);
  const pauseSession = useMutation(api.sessions.pauseSession);
  const resumeSession = useMutation(api.sessions.resumeSession);
  const updateInventory = useMutation(api.sessions.updateOrbInventory);
  const getOrCreateProfile = useMutation(api.sessions.getOrCreateProfile);
  const deleteCompletedItem = useMutation(api.sessions.deleteCompletedItem);
  const saveOrbInventory = useMutation(api.sessions.saveOrbInventory);
  const updateDisplayNameWithModeration = useAction(api.moderation.updateDisplayNameWithModeration);
  const pausedSessions = useQuery(api.sessions.getPausedSessions);

  // Load saved orb inventory from user profile on mount
  useEffect(() => {
    if (userProfile?.savedOrbInventory && !orbInventoryInitialized) {
      setOrbInventory(userProfile.savedOrbInventory);
      setOrbInventoryInitialized(true);
    }
  }, [userProfile, orbInventoryInitialized]);

  // Save orb inventory to profile when it changes (debounced)
  useEffect(() => {
    if (!orbInventoryInitialized) return;
    
    const timeoutId = setTimeout(() => {
      saveOrbInventory({ orbInventory });
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [orbInventory, orbInventoryInitialized, saveOrbInventory]);

  const sessionItemQuality = activeSession?.itemQuality ?? itemQuality;
  const maxLevel = MAX_ENCHANT[sessionItemQuality as ItemQuality];
  const currentLevel = activeSession?.currentLevel ?? 0;
  const orbQualityNum = ORB_TYPES.indexOf(selectedOrb) + 1;
  const expectedRate = enchantSuccessRate(currentLevel, sessionItemQuality as ItemQuality, orbQualityNum as OrbQuality);

  const handleStartSession = async () => {
    if (!itemName.trim()) {
      alert("Please enter an item name");
      return;
    }

    // Validate that selected rarity matches item name rarity
    const nameLower = itemName.toLowerCase();
    const rarityInName = ['white', 'radiant', 'blessed', 'holy', 'godly'].find(r => 
      nameLower.startsWith(r + ' ')
    );
    
    if (rarityInName) {
      const expectedQuality: Record<string, ItemQuality> = {
        'white': ItemQuality.White,
        'radiant': ItemQuality.Radiant,
        'blessed': ItemQuality.Blessed,
        'holy': ItemQuality.Holy,
        'godly': ItemQuality.Godly,
      };
      
      if (expectedQuality[rarityInName] !== itemQuality) {
        const selectedName = ITEM_QUALITY_NAMES[itemQuality];
        alert(`Rarity mismatch: Your item name says "${rarityInName}" but you selected "${selectedName}". Please match the rarity to your item.`);
        return;
      }
    }

    // Moderate and update display name if provided
    if (displayName.trim()) {
      const moderationResult = await updateDisplayNameWithModeration({ 
        displayName: displayName.trim() 
      });
      
      if (!moderationResult.success) {
        alert(`Display name rejected: ${moderationResult.error}`);
        return;
      }
    } else {
      await getOrCreateProfile({});
    }

    try {
      await startSession({
        itemName: itemName.trim(),
        itemQuality,
        orbInventory,
      });
    } catch (error: any) {
      alert(error.message || "Failed to start session");
    }
  };

  const handleLogAttempt = async (success: boolean) => {
    if (!activeSession) return;

    const currentOrbs = activeSession.orbInventory[selectedOrb];
    if (currentOrbs <= 0) {
      alert(`No ${selectedOrb} orbs remaining!`);
      return;
    }

    try {
      const result = await logAttempt({
        sessionId: activeSession._id,
        orbType: selectedOrb,
        success,
      });

      // Save updated orb inventory to profile after each attempt
      if (result.orbsRemaining) {
        saveOrbInventory({ orbInventory: result.orbsRemaining });
      }

      if (result.isMaxed) {
        alert(`🎉 Congratulations! Your ${activeSession.itemName} is now +${result.newLevel}!\n\nStats:\n- Total Attempts: ${result.stats?.totalAttempts}\n- Success Rate: ${result.stats?.successRate.toFixed(1)}%\n- Best Streak: ${result.stats?.bestStreak}`);
      }
    } catch (error: any) {
      alert(error.message || "Failed to log attempt");
    }
  };

  const handleAbandon = async () => {
    if (!activeSession) return;
    if (!confirm("Are you sure you want to abandon this item? Progress will not be saved to the leaderboard.")) {
      return;
    }

    try {
      await abandonSession({ sessionId: activeSession._id });
    } catch (error: any) {
      alert(error.message || "Failed to abandon session");
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    try {
      await pauseSession({ sessionId: activeSession._id });
    } catch (error: any) {
      alert(error.message || "Failed to pause session");
    }
  };

  const handleResume = async (sessionId: string) => {
    try {
      await resumeSession({ sessionId: sessionId as any });
    } catch (error: any) {
      alert(error.message || "Failed to resume session");
    }
  };

  const handleUpdateInventory = async () => {
    if (!activeSession) return;
    try {
      await updateInventory({
        sessionId: activeSession._id,
        orbInventory: activeSession.orbInventory,
      });
    } catch (error: any) {
      alert(error.message || "Failed to update inventory");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleDeleteCompleted = async (completedItemId: string, screenshotUrl?: string) => {
    if (!confirm("Are you sure you want to delete this completed item? This will remove it from the leaderboard and update your stats.")) {
      return;
    }

    try {
      // Delete from database first
      await deleteCompletedItem({ completedItemId: completedItemId as any });
      
      // If there's a screenshot, delete it from UploadThing
      if (screenshotUrl) {
        // Extract file key from UploadThing URL
        // URLs are like: https://utfs.io/f/FILE_KEY or https://ufs.sh/f/FILE_KEY
        const fileKeyMatch = screenshotUrl.match(/\/f\/([a-zA-Z0-9-_]+)/);
        if (fileKeyMatch && fileKeyMatch[1]) {
          try {
            await fetch('/api/uploadthing/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileKey: fileKeyMatch[1] }),
            });
          } catch (uploadError) {
            // Don't fail the whole operation if screenshot deletion fails
            console.error('Failed to delete screenshot from storage:', uploadError);
          }
        }
      }
    } catch (error: any) {
      alert(error.message || "Failed to delete item");
    }
  };

  // Calculate additional stats from completed sessions
  const userStats = completedSessions ? {
    totalItems: completedSessions.length,
    verifiedItems: completedSessions.filter(s => s.isVerified).length,
    totalOrbs: completedSessions.reduce((sum, s) => sum + s.totalOrbsUsed, 0),
    bestStreak: Math.max(0, ...completedSessions.map(s => s.bestStreak)),
    avgAttempts: completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + s.totalAttempts, 0) / completedSessions.length 
      : 0,
    qualityBreakdown: completedSessions.reduce((acc, s) => {
      acc[s.itemQuality] = (acc[s.itemQuality] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
  } : null;

  // No active session - show start form
  if (!activeSession) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Enchant Tracker</h2>
          <p className={styles.subtitle}>
            Track your enchanting journey and compete on the leaderboard
          </p>
        </div>

        {/* How To Use Guide */}
        <div className={styles.howToUseSection}>
          <h3 className={styles.sectionTitle}>How To Use</h3>
          <div className={styles.howToUseContent}>
            <div className={styles.howToStep}>
              <span className={styles.stepNumber}>1</span>
              <div className={styles.stepContent}>
                <strong>Enter Your Orb Inventory</strong>
                <p>Input how many of each orb type you have. This saves automatically and persists between sessions.</p>
              </div>
            </div>
            <div className={styles.howToStep}>
              <span className={styles.stepNumber}>2</span>
              <div className={styles.stepContent}>
                <strong>Enter Item Details</strong>
                <p>Type your item name (without +level) and select the quality. The system will auto-detect rarity from the name.</p>
              </div>
            </div>
            <div className={styles.howToStep}>
              <span className={styles.stepNumber}>3</span>
              <div className={styles.stepContent}>
                <strong>Track Each Enchant</strong>
                <p>Select which orb to use, then click Success (+1) or Failure (-1) after each in-game enchant attempt.</p>
              </div>
            </div>
            <div className={styles.howToStep}>
              <span className={styles.stepNumber}>4</span>
              <div className={styles.stepContent}>
                <strong>Pause or Complete</strong>
                <p>Need more orbs? Click Pause to save progress and resume later. When maxed, verify with a screenshot for the leaderboard!</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Statistics Section */}
        {userProfile && (
          <div className={styles.userStatsSection}>
            <h3 className={styles.sectionTitle}>Your Statistics</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{userProfile.totalItemsCompleted}</span>
                <span className={styles.statLabel}>Items Maxed</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{userProfile.totalAttempts.toLocaleString()}</span>
                <span className={styles.statLabel}>Total Attempts</span>
              </div>
              <div className={styles.statCard}>
                <span 
                  className={styles.statValue}
                  style={{ color: userProfile.overallSuccessRate >= 50 ? "#22c55e" : "#ef4444" }}
                >
                  {userProfile.overallSuccessRate.toFixed(1)}%
                </span>
                <span className={styles.statLabel}>Success Rate</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue} style={{ color: "#22c55e" }}>
                  {userStats?.verifiedItems || 0}
                </span>
                <span className={styles.statLabel}>Verified</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{userStats?.totalOrbs?.toLocaleString() || 0}</span>
                <span className={styles.statLabel}>Orbs Used</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue} style={{ color: "#fbbf24" }}>
                  🔥 {userStats?.bestStreak || 0}
                </span>
                <span className={styles.statLabel}>Best Streak</span>
              </div>
            </div>
            {userStats && userStats.totalItems > 0 && (
              <div className={styles.qualityBreakdown}>
                <span className={styles.breakdownLabel}>Items by Quality:</span>
                <div className={styles.breakdownBadges}>
                  {Object.entries(userStats.qualityBreakdown).map(([quality, count]) => (
                    <span 
                      key={quality}
                      className={styles.qualityBadge}
                      style={{ borderColor: ITEM_QUALITY_COLORS[Number(quality) as ItemQuality] }}
                    >
                      <span style={{ color: ITEM_QUALITY_COLORS[Number(quality) as ItemQuality] }}>
                        {ITEM_QUALITY_NAMES[Number(quality) as ItemQuality]}
                      </span>
                      <span className={styles.qualityCount}>{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.content}>
          

          <div className={styles.startSection}>
            <h3 className={styles.sectionTitle}>Start New Item</h3>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Display Name (for leaderboard)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={userProfile?.displayName || "Anonymous"}
                className={styles.textInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Item Name *</label>
              <p className={styles.inputHelpText}>
                Enter your unenchanted item name (without +level). Start typing to see suggestions, 
                but you can still submit if your item isn&apos;t in the dropdown.
              </p>
              <div className={styles.autocompleteWrapper}>
                <input
                  ref={inputRef}
                  type="text"
                  value={itemName}
                  onChange={(e) => {
                    setItemName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g., Blessed Greatbow of the Abjurer"
                  className={styles.textInput}
                  autoComplete="off"
                />
                {showSuggestions && itemSuggestions && itemSuggestions.length > 0 && (
                  <div ref={suggestionsRef} className={styles.suggestionsDropdown}>
                    {itemSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className={styles.suggestionItem}
                        onClick={() => {
                          setItemName(suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {itemName.trim() && itemValidation && (
                <div className={styles.validationFeedback}>
                  <span 
                    className={styles.validationScore}
                    style={{ color: itemValidation.isValid ? "#22c55e" : itemValidation.score >= 25 ? "#eab308" : "#ef4444" }}
                  >
                    {itemValidation.isValid ? "✓ Valid" : itemValidation.score >= 25 ? "⚠ Partial match" : "✗ Invalid"}
                  </span>
                  {!itemValidation.isValid && itemValidation.issues.length > 0 && (
                    <span className={styles.validationHint}>
                      {itemValidation.issues[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Item Quality</label>
              <ColorDropdown
                label=""
                value={itemQuality}
                onChange={(value) => setItemQuality(value as ItemQuality)}
                options={Object.entries(ITEM_QUALITY_NAMES).map(([value, name]) => ({
                  value: Number(value),
                  label: `${name} — Max Enchant: +${MAX_ENCHANT[Number(value) as ItemQuality]}`,
                  color: ITEM_QUALITY_COLORS[Number(value) as ItemQuality],
                }))}
              />
            </div>

            <div className={styles.orbInventorySection}>
              <label className={styles.label}>Your Orb Inventory</label>
              <div className={styles.orbGrid}>
                {ORB_TYPES.map((orb) => (
                  <div key={orb} className={styles.orbInput}>
                    <label 
                      className={styles.orbLabel}
                      style={{ color: ORB_QUALITY_COLORS[(ORB_TYPES.indexOf(orb) + 1) as OrbQuality] }}
                    >
                      {orb.charAt(0).toUpperCase() + orb.slice(1)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={orbInventory[orb]}
                      onChange={(e) => setOrbInventory({
                        ...orbInventory,
                        [orb]: Math.max(0, parseInt(e.target.value) || 0),
                      })}
                      className={styles.orbNumberInput}
                    />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleStartSession} className={styles.startButton}>
              Start Tracking
            </button>
          </div>

          {/* Paused Sessions */}
          {pausedSessions && pausedSessions.length > 0 && (
            <div className={styles.pausedSection}>
              <h3 className={styles.sectionTitle}>Paused Items</h3>
              <div className={styles.pausedList}>
                {pausedSessions.map((session) => (
                  <div key={session._id} className={styles.pausedItem}>
                    <div className={styles.pausedInfo}>
                      <span 
                        className={styles.pausedName}
                        style={{ color: ITEM_QUALITY_COLORS[session.itemQuality as ItemQuality] }}
                      >
                        {session.itemName}
                      </span>
                      <span className={styles.pausedProgress}>
                        +{session.currentLevel} / +{session.targetLevel}
                      </span>
                    </div>
                    <div className={styles.pausedStats}>
                      <span>{session.totalAttempts} attempts</span>
                      <span style={{ color: session.totalAttempts > 0 ? (session.totalSuccesses / session.totalAttempts * 100) >= 50 ? "#22c55e" : "#ef4444" : "inherit" }}>
                        {session.totalAttempts > 0 ? ((session.totalSuccesses / session.totalAttempts) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <button
                      onClick={() => handleResume(session._id)}
                      className={styles.resumeButton}
                    >
                      ▶ Resume
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedSessions && completedSessions.length > 0 && (() => {
              // Filter and sort completed items
              const filteredItems = completedSessions
                .filter(item => 
                  completedSearch === "" || 
                  item.itemName.toLowerCase().includes(completedSearch.toLowerCase())
                )
                .sort((a, b) => {
                  switch (completedSort) {
                    case "oldest":
                      return a.completedAt - b.completedAt;
                    case "orbs":
                      return (b.totalOrbsUsed || 0) - (a.totalOrbsUsed || 0);
                    case "rarity":
                      return b.itemQuality - a.itemQuality;
                    case "success":
                      return b.successRate - a.successRate;
                    case "newest":
                    default:
                      return b.completedAt - a.completedAt;
                  }
                });
              
              const displayedItems = filteredItems;
              // Use server-side hasMore flag (already fetched with limit)
              const hasMore = hasMoreCompleted;

              return (
            <div className={styles.historySection}>
              <h3 className={styles.sectionTitle}>
                Your Completed Items 
                <span className={styles.itemCount}>({filteredItems.length})</span>
              </h3>
              
              <div className={styles.completedControls}>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={completedSearch}
                  onChange={(e) => setCompletedSearch(e.target.value)}
                  className={styles.completedSearchInput}
                />
                <select
                  value={completedSort}
                  onChange={(e) => setCompletedSort(e.target.value as typeof completedSort)}
                  className={styles.completedSortSelect}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="orbs">Most Orbs Used</option>
                  <option value="rarity">Highest Rarity</option>
                  <option value="success">Best Success Rate</option>
                </select>
              </div>

              <div className={styles.completedTable}>
                <div className={styles.completedTableHeader}>
                  <div className={styles.colItem}>Item</div>
                  <div className={styles.colLevel}>Level</div>
                  <div className={styles.colRate}>Rate</div>
                  <div className={styles.colAttempts}>Attempts</div>
                  <div className={styles.colOrbs}>Orbs</div>
                  <div className={styles.colDate}>Date</div>
                  <div className={styles.colActions}>Actions</div>
                </div>
                <div className={styles.completedTableBody}>
                  {displayedItems.map((item) => (
                    <div key={item._id} className={`${styles.completedTableRow} ${!item.isVerified ? styles.unverifiedRow : ''}`}>
                      <div className={styles.colItem}>
                        <span 
                          className={styles.itemNameText}
                          style={{ color: ITEM_QUALITY_COLORS[item.itemQuality as ItemQuality] }}
                        >
                          {item.itemName}
                        </span>
                        <span className={styles.itemQualityText}>
                          {ITEM_QUALITY_NAMES[item.itemQuality as ItemQuality]}
                        </span>
                      </div>
                      <div className={styles.colLevel}>
                        <span className={styles.levelBadge}>+{item.finalLevel}</span>
                      </div>
                      <div className={styles.colRate}>
                        <span style={{ color: item.successRate >= 50 ? "#22c55e" : "#ef4444" }}>
                          {item.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className={styles.colAttempts}>
                        {item.totalAttempts}
                      </div>
                      <div className={styles.colOrbs}>
                        {item.orbsUsedByType ? (
                          <button
                            onClick={() => setOrbModal({
                              isOpen: true,
                              itemName: item.itemName,
                              finalLevel: item.finalLevel,
                              totalAttempts: item.totalAttempts,
                              totalSuccesses: item.totalSuccesses ?? 0,
                              totalFailures: item.totalFailures ?? 0,
                              successRate: item.successRate,
                              orbsUsedByType: item.orbsUsedByType!,
                            })}
                            className={styles.orbBtn}
                            title="View orb breakdown"
                          >
                            🔮 {item.totalOrbsUsed}
                          </button>
                        ) : (
                          <span className={styles.noData}>—</span>
                        )}
                      </div>
                      <div className={styles.colDate}>
                        {formatDate(item.completedAt)}
                      </div>
                      <div className={styles.colActions}>
                        {item.isVerified && (
                          <span className={styles.verifiedBadge} title="Verified">✓</span>
                        )}
                        {item.isVerified && item.screenshotUrl && (
                          <button
                            onClick={() => setProofModal({
                              isOpen: true,
                              imageUrl: item.screenshotUrl!,
                              itemName: item.itemName,
                              finalLevel: item.finalLevel,
                            })}
                            className={styles.actionBtn}
                            title="View proof"
                          >
                            📷
                          </button>
                        )}
                        {!item.isVerified && (
                          <button
                            onClick={() => setVerifyingItem({
                              id: item._id,
                              itemName: item.itemName,
                              finalLevel: item.finalLevel,
                            })}
                            className={styles.verifyBtn}
                            title="Verify with screenshot"
                          >
                            📷 Verify
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCompleted(item._id, item.screenshotUrl)}
                          className={styles.deleteBtn}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {hasMore && (
                <button
                  onClick={() => setCompletedDisplayLimit(prev => prev + 15)}
                  className={styles.loadMoreButton}
                >
                  Load More
                </button>
              )}
              
              {verifyingItem && (
                <div className={styles.verificationPanel}>
                  <div className={styles.verificationHeader}>
                    <span>Verify: <strong>{verifyingItem.itemName}</strong> +{verifyingItem.finalLevel}</span>
                    <button 
                      onClick={() => setVerifyingItem(null)}
                      className={styles.closeVerifyBtn}
                    >
                      ✕
                    </button>
                  </div>
                  <ScreenshotVerification
                    completedItemId={verifyingItem.id as any}
                    itemName={verifyingItem.itemName}
                    finalLevel={verifyingItem.finalLevel}
                    isVerified={false}
                    onVerificationComplete={() => setVerifyingItem(null)}
                  />
                </div>
              )}
            </div>
              );
            })()}
        </div>

        <ProofModal
          isOpen={proofModal.isOpen}
          onClose={() => setProofModal({ ...proofModal, isOpen: false })}
          imageUrl={proofModal.imageUrl}
          itemName={proofModal.itemName}
          finalLevel={proofModal.finalLevel}
        />

        {orbModal.orbsUsedByType && (
          <OrbBreakdownModal
            isOpen={orbModal.isOpen}
            onClose={() => setOrbModal({ ...orbModal, isOpen: false })}
            itemName={orbModal.itemName}
            finalLevel={orbModal.finalLevel}
            totalAttempts={orbModal.totalAttempts}
            totalSuccesses={orbModal.totalSuccesses}
            totalFailures={orbModal.totalFailures}
            successRate={orbModal.successRate}
            orbsUsedByType={orbModal.orbsUsedByType}
          />
        )}
      </div>
    );
  }

  // Active session - show tracking UI
  const session = activeSession;
  const successRate = session.totalAttempts > 0 
    ? (session.totalSuccesses / session.totalAttempts) * 100 
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Tracking: {session.itemName}</h2>
        <p className={styles.subtitle}>
          <span style={{ color: ITEM_QUALITY_COLORS[session.itemQuality as ItemQuality] }}>
            {ITEM_QUALITY_NAMES[session.itemQuality as ItemQuality]}
          </span>
          {" "}• Target: +{session.targetLevel}
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.progressSection}>
          <div className={styles.levelDisplay}>
            <span className={styles.currentLevelLabel}>Current Level</span>
            <span className={styles.currentLevelValue}>+{session.currentLevel}</span>
            <span className={styles.levelProgress}>
              {session.currentLevel} / {session.targetLevel}
            </span>
          </div>

          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${(session.currentLevel / session.targetLevel) * 100}%` }}
            />
          </div>
        </div>

        <div className={styles.orbSelector}>
          <label className={styles.label}>Select Orb to Use</label>
          <div className={styles.orbButtons}>
            {ORB_TYPES.map((orb) => {
              const count = session.orbInventory[orb];
              const isSelected = selectedOrb === orb;
              const orbColor = ORB_QUALITY_COLORS[(ORB_TYPES.indexOf(orb) + 1) as OrbQuality];
              
              return (
                <button
                  key={orb}
                  onClick={() => setSelectedOrb(orb)}
                  className={`${styles.orbButton} ${isSelected ? styles.orbButtonSelected : ''}`}
                  style={{ 
                    borderColor: isSelected ? orbColor : undefined,
                    color: isSelected ? orbColor : undefined,
                  }}
                  disabled={count <= 0}
                >
                  <span className={styles.orbName}>{orb.charAt(0).toUpperCase() + orb.slice(1)}</span>
                  <span className={styles.orbCount} style={{ color: count > 0 ? orbColor : '#ef4444' }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.expectedRate}>
          <span className={styles.expectedLabel}>Success Rate with {selectedOrb} orb:</span>
          <span
            className={styles.expectedValue}
            style={{
              color:
                expectedRate >= 70 ? "#22c55e"
                : expectedRate >= 40 ? "#eab308"
                : expectedRate >= 20 ? "#f97316"
                : "#ef4444",
            }}
          >
            {expectedRate.toFixed(1)}%
          </span>
        </div>

        <div className={styles.actionButtons}>
          <button
            onClick={() => handleLogAttempt(true)}
            className={styles.successButton}
            disabled={session.currentLevel >= session.targetLevel || session.orbInventory[selectedOrb] <= 0}
          >
            ✓ Success (+1)
          </button>
          <button
            onClick={() => handleLogAttempt(false)}
            className={styles.failButton}
            disabled={session.orbInventory[selectedOrb] <= 0 || session.currentLevel === 0}
          >
            ✗ Failure (-1)
          </button>
        </div>

        <div className={styles.statsSection}>
          <h3 className={styles.sectionTitle}>Session Stats</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{session.totalAttempts}</span>
              <span className={styles.statLabel}>Total Attempts</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: "#22c55e" }}>
                {session.totalSuccesses}
              </span>
              <span className={styles.statLabel}>Successes</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: "#ef4444" }}>
                {session.totalFailures}
              </span>
              <span className={styles.statLabel}>Failures</span>
            </div>
            <div className={styles.statCard}>
              <span
                className={styles.statValue}
                style={{ color: successRate >= 50 ? "#22c55e" : "#ef4444" }}
              >
                {successRate.toFixed(1)}%
              </span>
              <span className={styles.statLabel}>Success Rate</span>
            </div>
            <div className={styles.statCard}>
              <span
                className={styles.statValue}
                style={{
                  color: session.currentStreak > 0 ? "#22c55e"
                    : session.currentStreak < 0 ? "#ef4444"
                    : "var(--text-primary)",
                }}
              >
                {session.currentStreak > 0 ? `+${session.currentStreak}` : session.currentStreak}
              </span>
              <span className={styles.statLabel}>Current Streak</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue} style={{ color: "#22c55e" }}>
                {session.bestStreak}
              </span>
              <span className={styles.statLabel}>Best Streak</span>
            </div>
          </div>
        </div>

        <div className={styles.abandonSection}>
          <button onClick={handlePause} className={styles.pauseButton}>
            ⏸ Pause Item
          </button>
          <button onClick={handleAbandon} className={styles.abandonButton}>
            Abandon Item
          </button>
          <p className={styles.abandonNote}>
            Pause to resume later • Abandoned items won&apos;t appear on the leaderboard
          </p>
        </div>
      </div>
    </div>
  );
}
