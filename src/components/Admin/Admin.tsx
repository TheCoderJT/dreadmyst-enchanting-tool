"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import styles from "./Admin.module.css";

type Tab = "dashboard" | "users" | "submissions" | "history";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [selectedUser, setSelectedUser] = useState<Id<"users"> | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [warnReason, setWarnReason] = useState("");
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<Id<"completedItems"> | null>(null);

  // Queries
  const adminCheck = useQuery(api.admin.isAdmin);
  const stats = useQuery(api.admin.getAdminStats);
  const users = useQuery(api.admin.getAllUsers, { limit: 100 });
  const completedItems = useQuery(api.admin.getAllCompletedItems, { limit: 100 });
  const moderationHistory = useQuery(api.admin.getModerationHistory, { limit: 50 });

  // Mutations
  const banUser = useMutation(api.admin.banUser);
  const unbanUser = useMutation(api.admin.unbanUser);
  const warnUser = useMutation(api.admin.warnUser);
  const deleteItem = useMutation(api.admin.deleteCompletedItemAdmin);

  if (!adminCheck?.isModerator) {
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h2>Access Denied</h2>
          <p>You do not have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const handleBan = async () => {
    if (!selectedUser || !banReason) return;
    try {
      await banUser({
        targetUserId: selectedUser,
        reason: banReason,
        durationDays: banDuration || undefined,
      });
      setShowBanModal(false);
      setBanReason("");
      setBanDuration(null);
      setSelectedUser(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUnban = async (userId: Id<"users">) => {
    try {
      await unbanUser({
        targetUserId: userId,
        reason: "Unbanned by admin",
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleWarn = async () => {
    if (!selectedUser || !warnReason) return;
    try {
      await warnUser({
        targetUserId: selectedUser,
        reason: warnReason,
      });
      setShowWarnModal(false);
      setWarnReason("");
      setSelectedUser(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItemId || !deleteReason) return;
    try {
      await deleteItem({
        completedItemId: selectedItemId,
        reason: deleteReason,
      });
      setShowDeleteModal(false);
      setDeleteReason("");
      setSelectedItemId(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <span className={styles.roleBadge}>
          {adminCheck.isAdmin ? "Admin" : "Moderator"}
        </span>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "dashboard" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          className={`${styles.tab} ${activeTab === "submissions" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("submissions")}
        >
          Submissions
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Mod History
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "dashboard" && (
          <div className={styles.dashboard}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats?.totalUsers || 0}</span>
                <span className={styles.statLabel}>Total Users</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats?.bannedUsers || 0}</span>
                <span className={styles.statLabel}>Banned Users</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats?.totalCompletedItems || 0}</span>
                <span className={styles.statLabel}>Total Submissions</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{stats?.verifiedItems || 0}</span>
                <span className={styles.statLabel}>Verified Items</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className={styles.usersSection}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Display Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user._id} className={user.isBanned ? styles.bannedRow : ""}>
                      <td>{user.displayName}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`${styles.rolePill} ${styles[`role${user.role || "user"}`]}`}>
                          {user.role || "user"}
                        </span>
                      </td>
                      <td>{user.totalItemsCompleted}</td>
                      <td>
                        {user.isBanned ? (
                          <span className={styles.bannedBadge}>
                            Banned
                            {user.bannedUntil && (
                              <span className={styles.banExpiry}>
                                until {new Date(user.bannedUntil).toLocaleDateString()}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className={styles.activeBadge}>Active</span>
                        )}
                      </td>
                      <td className={styles.actions}>
                        {user.isBanned ? (
                          <button
                            className={styles.unbanBtn}
                            onClick={() => handleUnban(user.userId)}
                          >
                            Unban
                          </button>
                        ) : (
                          <>
                            <button
                              className={styles.warnBtn}
                              onClick={() => {
                                setSelectedUser(user.userId);
                                setShowWarnModal(true);
                              }}
                            >
                              Warn
                            </button>
                            <button
                              className={styles.banBtn}
                              onClick={() => {
                                setSelectedUser(user.userId);
                                setShowBanModal(true);
                              }}
                            >
                              Ban
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className={styles.submissionsSection}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Item</th>
                    <th>Level</th>
                    <th>Success Rate</th>
                    <th>Verified</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedItems?.map((item) => (
                    <tr key={item._id} className={item.userIsBanned ? styles.bannedRow : ""}>
                      <td>
                        {item.userDisplayName}
                        {item.userIsBanned && <span className={styles.bannedTag}>(banned)</span>}
                      </td>
                      <td>{item.itemName}</td>
                      <td>+{item.finalLevel}</td>
                      <td>{item.successRate.toFixed(1)}%</td>
                      <td>
                        {item.isVerified ? (
                          <span className={styles.verifiedBadge}>✓</span>
                        ) : (
                          <span className={styles.unverifiedBadge}>—</span>
                        )}
                      </td>
                      <td>{formatDate(item.completedAt)}</td>
                      <td className={styles.actions}>
                        {item.screenshotUrl && (
                          <a
                            href={item.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.viewBtn}
                          >
                            View
                          </a>
                        )}
                        <button
                          className={styles.deleteBtn}
                          onClick={() => {
                            setSelectedItemId(item._id);
                            setShowDeleteModal(true);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className={styles.historySection}>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Moderator</th>
                    <th>Action</th>
                    <th>Target User</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {moderationHistory?.map((action) => (
                    <tr key={action._id}>
                      <td>{formatDate(action.timestamp)}</td>
                      <td>{action.moderatorName}</td>
                      <td>
                        <span className={`${styles.actionBadge} ${styles[`action${action.action}`]}`}>
                          {action.action}
                        </span>
                      </td>
                      <td>{action.targetName}</td>
                      <td className={styles.reasonCell}>{action.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBanModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Ban User</h3>
            <div className={styles.formGroup}>
              <label>Reason</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason..."
                rows={3}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Duration</label>
              <select
                value={banDuration || ""}
                onChange={(e) => setBanDuration(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Permanent</option>
                <option value="1">1 Day</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowBanModal(false)}>
                Cancel
              </button>
              <button className={styles.confirmBanBtn} onClick={handleBan} disabled={!banReason}>
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warn Modal */}
      {showWarnModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWarnModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Warn User</h3>
            <div className={styles.formGroup}>
              <label>Reason</label>
              <textarea
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                placeholder="Enter warning reason..."
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowWarnModal(false)}>
                Cancel
              </button>
              <button className={styles.confirmWarnBtn} onClick={handleWarn} disabled={!warnReason}>
                Send Warning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Submission</h3>
            <div className={styles.formGroup}>
              <label>Reason</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter deletion reason..."
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleDeleteItem} disabled={!deleteReason}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
