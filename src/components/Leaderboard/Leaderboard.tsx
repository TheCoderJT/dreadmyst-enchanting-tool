"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  ItemQuality,
  OrbQuality,
  ITEM_QUALITY_NAMES,
  ITEM_QUALITY_COLORS,
  ORB_QUALITY_COLORS,
} from "@/lib/enchant-engine";
import ProofModal from "@/components/ProofModal/ProofModal";
import OrbBreakdownModal from "@/components/OrbBreakdownModal/OrbBreakdownModal";
import styles from "./Leaderboard.module.css";

type SortOption = "recent" | "luckiest" | "unluckiest";
type QualityFilter = "all" | 1 | 2 | 3 | 4 | 5;
type VerifiedFilter = "all" | "verified" | "unverified";

const ITEMS_PER_PAGE = 50;

export default function Leaderboard() {
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
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

  const recentCompletions = useQuery(api.leaderboard.getRecentCompletions, { limit: displayLimit });
  const topBySuccessRate = useQuery(api.leaderboard.getTopBySuccessRate, { limit: displayLimit });
  const unluckiestCompletions = useQuery(api.leaderboard.getUnluckiest, { limit: displayLimit });
  const communityStats = useQuery(api.leaderboard.getCommunityStats);
  const topPlayers = useQuery(api.leaderboard.getTopPlayers, { limit: 10 });

  const baseCompletions = sortBy === "luckiest" 
    ? topBySuccessRate 
    : sortBy === "unluckiest" 
      ? unluckiestCompletions 
      : recentCompletions;
  
  const filteredCompletions = baseCompletions?.filter((item) => {
    if (qualityFilter !== "all" && item.itemQuality !== qualityFilter) return false;
    if (verifiedFilter === "verified" && !item.isVerified) return false;
    if (verifiedFilter === "unverified" && item.isVerified) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = item.itemName.toLowerCase().includes(query);
      const matchesPlayer = item.displayName?.toLowerCase().includes(query);
      if (!matchesName && !matchesPlayer) return false;
    }
    return true;
  });

  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const top3Players = topPlayers?.slice(0, 3) || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Hall of Fame</h1>
        <p className={styles.subtitle}>
          Celebrating the community&apos;s greatest enchanters
        </p>
      </div>

      {top3Players.length > 0 && (
        <div className={styles.podiumSection}>
          <div className={styles.podiumTitle}>Top Enchanters</div>
          <div className={styles.podium}>
            {top3Players[1] && (
              <div className={`${styles.podiumPlace} ${styles.podiumSecond}`}>
                <div className={styles.podiumMedal}>🥈</div>
                <div className={styles.podiumRank}>#2</div>
                <div className={styles.podiumName}>{top3Players[1].displayName}</div>
                <div className={styles.podiumStats}>
                  <span>{top3Players[1].totalItemsCompleted} items</span>
                  <span className={styles.podiumRate}>
                    {top3Players[1].overallSuccessRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            {top3Players[0] && (
              <div className={`${styles.podiumPlace} ${styles.podiumFirst}`}>
                <div className={styles.podiumMedal}>🥇</div>
                <div className={styles.podiumRank}>#1</div>
                <div className={styles.podiumName}>{top3Players[0].displayName}</div>
                <div className={styles.podiumStats}>
                  <span>{top3Players[0].totalItemsCompleted} items</span>
                  <span className={styles.podiumRate}>
                    {top3Players[0].overallSuccessRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            {top3Players[2] && (
              <div className={`${styles.podiumPlace} ${styles.podiumThird}`}>
                <div className={styles.podiumMedal}>🥉</div>
                <div className={styles.podiumRank}>#3</div>
                <div className={styles.podiumName}>{top3Players[2].displayName}</div>
                <div className={styles.podiumStats}>
                  <span>{top3Players[2].totalItemsCompleted} items</span>
                  <span className={styles.podiumRate}>
                    {top3Players[2].overallSuccessRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {communityStats && (
        <div className={styles.pulseBar}>
          <div className={styles.pulseStat}>
            <span className={styles.pulseValue}>{communityStats.totalUsers}</span>
            <span className={styles.pulseLabel}>Enchanters</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={styles.pulseStat}>
            <span className={styles.pulseValue}>{communityStats.totalItemsMaxed}</span>
            <span className={styles.pulseLabel}>Items Maxed</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={styles.pulseStat}>
            <span 
              className={styles.pulseValue}
              style={{ color: communityStats.globalSuccessRate >= 50 ? "#22c55e" : "#ef4444" }}
            >
              {communityStats.globalSuccessRate.toFixed(1)}%
            </span>
            <span className={styles.pulseLabel}>Global Rate</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={styles.pulseStat}>
            <span className={styles.pulseValue}>{communityStats.totalOrbsUsed.toLocaleString()}</span>
            <span className={styles.pulseLabel}>Orbs Used</span>
          </div>
          <div className={styles.pulseDivider} />
          <div className={styles.pulseStat}>
            <span className={styles.pulseValue} style={{ color: "#22c55e" }}>
              {communityStats.totalVerified}
            </span>
            <span className={styles.pulseLabel}>
              Verified ({communityStats.totalItemsMaxed > 0 ? ((communityStats.totalVerified / communityStats.totalItemsMaxed) * 100).toFixed(0) : 0}%)
            </span>
          </div>
          {communityStats.luckiestPlayer && (
            <>
              <div className={styles.pulseDivider} />
              <div className={styles.pulseStat}>
                <span className={styles.pulseValue} style={{ color: "#22c55e" }}>
                  {communityStats.luckiestPlayer.displayName}
                </span>
                <span className={styles.pulseLabel}>
                  Luckiest ({communityStats.luckiestPlayer.successRate.toFixed(1)}%)
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.filterTabs}>
          <button
            onClick={() => setSortBy("recent")}
            className={`${styles.filterTab} ${sortBy === "recent" ? styles.filterTabActive : ""}`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortBy("luckiest")}
            className={`${styles.filterTab} ${sortBy === "luckiest" ? styles.filterTabActive : ""}`}
          >
            Luckiest
          </button>
          <button
            onClick={() => setSortBy("unluckiest")}
            className={`${styles.filterTab} ${sortBy === "unluckiest" ? styles.filterTabActive : ""}`}
          >
            Unluckiest
          </button>
          <button
            onClick={() => setVerifiedFilter(verifiedFilter === "verified" ? "all" : "verified")}
            className={`${styles.filterTab} ${verifiedFilter === "verified" ? styles.filterTabActive : ""}`}
          >
            ✓ Verified
          </button>
        </div>
        <div className={styles.filterControls}>
          <select
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value === "all" ? "all" : Number(e.target.value) as QualityFilter)}
            className={styles.filterSelect}
          >
            <option value="all">All Qualities</option>
            <option value="5">Godly</option>
            <option value="4">Holy</option>
            <option value="3">Blessed</option>
            <option value="2">Radiant</option>
            <option value="1">White</option>
          </select>
          <input
            type="text"
            placeholder="Search items or players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.filterSearch}
          />
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <div className={styles.tableColRank}>#</div>
          <div className={styles.tableColPlayer}>Enchanter</div>
          <div className={styles.tableColItem}>Item</div>
          <div className={styles.tableColLevel}>Level</div>
          <div className={styles.tableColRate}>Success</div>
          <div className={styles.tableColAttempts}>Attempts</div>
          <div className={styles.tableColOrbs}>Orbs</div>
          <div className={styles.tableColTime}>When</div>
          <div className={styles.tableColProof}>Proof</div>
        </div>

        {filteredCompletions && filteredCompletions.length > 0 ? (
          <div className={styles.tableBody}>
            {filteredCompletions.map((item, index) => (
              <div key={item._id} className={`${styles.tableRow} ${!item.isVerified ? styles.unverifiedRow : ''}`}>
                <div className={styles.tableColRank}>
                  <span className={styles.rankNumber}>{index + 1}</span>
                </div>
                <div className={styles.tableColPlayer}>
                  <span className={styles.playerName}>{item.displayName || "Anonymous"}</span>
                </div>
                <div className={styles.tableColItem}>
                  <span 
                    className={styles.itemName}
                    style={{ color: ITEM_QUALITY_COLORS[item.itemQuality as ItemQuality] }}
                  >
                    {item.itemName}
                  </span>
                  <span className={styles.itemQuality}>
                    {ITEM_QUALITY_NAMES[item.itemQuality as ItemQuality]}
                  </span>
                </div>
                <div className={styles.tableColLevel}>
                  <span className={styles.levelBadge}>+{item.finalLevel}</span>
                </div>
                <div className={styles.tableColRate}>
                  <span 
                    className={styles.rateValue}
                    style={{ color: item.successRate >= 50 ? "#22c55e" : "#ef4444" }}
                  >
                    {item.successRate.toFixed(1)}%
                  </span>
                </div>
                <div className={styles.tableColAttempts}>
                  <span className={styles.attemptsValue}>{item.totalAttempts}</span>
                  {item.bestStreak > 0 && (
                    <span className={styles.streakBadge}>🔥{item.bestStreak}</span>
                  )}
                </div>
                <div className={styles.tableColOrbs}>
                  {item.orbsUsedByType ? (
                    <button
                      onClick={() => setOrbModal({
                        isOpen: true,
                        itemName: item.itemName,
                        finalLevel: item.finalLevel,
                        totalAttempts: item.totalAttempts,
                        totalSuccesses: item.totalSuccesses,
                        totalFailures: item.totalFailures,
                        successRate: item.successRate,
                        orbsUsedByType: item.orbsUsedByType!,
                      })}
                      className={styles.orbButton}
                      title="View orb breakdown"
                    >
                      🔮 {item.totalOrbsUsed}
                    </button>
                  ) : (
                    <span className={styles.noOrbData}>—</span>
                  )}
                </div>
                <div className={styles.tableColTime}>
                  <span className={styles.timeValue}>{formatDate(item.completedAt)}</span>
                </div>
                <div className={styles.tableColProof}>
                  {item.isVerified ? (
                    item.screenshotUrl ? (
                      <button
                        onClick={() => setProofModal({
                          isOpen: true,
                          imageUrl: item.screenshotUrl!,
                          itemName: item.itemName,
                          finalLevel: item.finalLevel,
                        })}
                        className={styles.proofButton}
                        title="View proof"
                      >
                        ✓
                      </button>
                    ) : (
                      <span className={styles.verifiedBadge}>✓</span>
                    )
                  ) : (
                    <span className={styles.unverifiedBadge}>○</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>
            <p>No completed items yet. Be the first to max an item!</p>
          </div>
        )}

        {filteredCompletions && filteredCompletions.length >= displayLimit && (
          <div className={styles.loadMoreContainer}>
            <button
              onClick={() => setDisplayLimit(displayLimit + ITEMS_PER_PAGE)}
              className={styles.loadMoreButton}
            >
              Load More
            </button>
          </div>
        )}
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
