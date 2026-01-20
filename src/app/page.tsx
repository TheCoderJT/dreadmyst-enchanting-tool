'use client';

import { useState, useMemo, useEffect } from 'react';
import { useConvexAuth } from 'convex/react';
import styles from './page.module.css';
import StrategyComparison from '@/components/StrategyComparison';
import SimulationResults from '@/components/SimulationResults';
import TabNavigation from '@/components/TabNavigation';
import ColorDropdown from '@/components/ColorDropdown';
import AuthForm from '@/components/Auth/AuthForm';
import UserMenu from '@/components/Auth/UserMenu';
import EnchantTracker from '@/components/EnchantTracker';
import Leaderboard from '@/components/Leaderboard';
import Logo from '@/components/Logo/Logo';
import Admin from '@/components/Admin/Admin';
import Guidelines from '@/components/Guidelines/Guidelines';
import TermsOfService from '@/components/TermsOfService/TermsOfService';
import PrivacyPolicy from '@/components/PrivacyPolicy/PrivacyPolicy';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  ItemQuality,
  OrbQuality,
  ITEM_QUALITY_NAMES,
  ORB_QUALITY_NAMES,
  ITEM_QUALITY_COLORS,
  ORB_QUALITY_COLORS,
  MAX_ENCHANT,
  enchantSuccessRate,
  totalExpectedOrbsToMax,
  getRiskLevel,
  getRecommendedOrb,
  analyzeEnchantPath,
} from '@/lib/enchant-engine';

const BASE_TABS = [
  { id: 'calculator', label: 'Calculator', icon: '📊' },
  { id: 'simulator', label: 'Simulator', icon: '🎲' },
  { id: 'tracker', label: 'My Tracker', icon: '📜' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'guidelines', label: 'Guidelines', icon: '📋' },
];

const ADMIN_TAB = { id: 'admin', label: 'Admin', icon: '⚙️' };

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [activeTab, setActiveTab] = useState('calculator');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [itemQuality, setItemQuality] = useState<ItemQuality>(ItemQuality.Godly);
  const [orbQuality, setOrbQuality] = useState<OrbQuality>(OrbQuality.Divine);
  const [currentLevel, setCurrentLevel] = useState<number>(0);

  // Check if user is admin/moderator - skip when not authenticated
  const adminCheck = useQuery(api.admin.isAdmin, isAuthenticated ? {} : "skip");

  // Persist active tab in URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const validTabs = ['calculator', 'simulator', 'tracker', 'leaderboard', 'guidelines', 'admin', 'terms', 'privacy'];
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
    setMobileMenuOpen(false);
  };
  const TABS = adminCheck?.isModerator ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  const maxEnchant = MAX_ENCHANT[itemQuality];

  const calculations = useMemo(() => {
    const successRate = enchantSuccessRate(currentLevel, itemQuality, orbQuality);
    const expectedOrbs = totalExpectedOrbsToMax(currentLevel, itemQuality, orbQuality);
    const riskLevel = getRiskLevel(successRate);
    const recommendedOrb = getRecommendedOrb(currentLevel, itemQuality);
    const steps = analyzeEnchantPath(currentLevel, itemQuality, orbQuality);

    return {
      successRate,
      expectedOrbs,
      riskLevel,
      recommendedOrb,
      steps,
    };
  }, [itemQuality, orbQuality, currentLevel]);

  const getRiskClass = (risk: string) => {
    switch (risk) {
      case 'safe':
        return styles.riskSafe;
      case 'moderate':
        return styles.riskModerate;
      case 'risky':
        return styles.riskRisky;
      case 'dangerous':
        return styles.riskDangerous;
      default:
        return '';
    }
  };

  const formatNumber = (num: number) => {
    if (!isFinite(num)) return '∞';
    if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toFixed(1) + 'T';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 10_000) return (num / 1_000).toFixed(1) + 'K';
    if (num >= 1000) return num.toFixed(0);
    if (num >= 100) return num.toFixed(1);
    return num.toFixed(2);
  };

  return (
    <main className={styles.main}>
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <Logo size="medium" showText={true} />
          
          {/* Desktop Navigation */}
          <div className={styles.navTabs}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.navTab} ${activeTab === tab.id ? styles.navTabActive : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                <span className={styles.navTabIcon}>{tab.icon}</span>
                <span className={styles.navTabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>
          
          <div className={styles.navAuth}>
            <UserMenu onAuthSuccess={() => handleTabChange('tracker')} />
          </div>
          
          {/* Mobile Hamburger Button */}
          <button
            className={styles.hamburgerButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.hamburgerLineOpen : ''}`} />
            <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.hamburgerLineOpen : ''}`} />
            <span className={`${styles.hamburgerLine} ${mobileMenuOpen ? styles.hamburgerLineOpen : ''}`} />
          </button>
        </div>
        
        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenuOverlay} onClick={() => setMobileMenuOpen(false)} />
        )}
        
        {/* Mobile Menu */}
        <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.mobileMenuItem} ${activeTab === tab.id ? styles.mobileMenuItemActive : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className={styles.mobileMenuIcon}>{tab.icon}</span>
              <span className={styles.mobileMenuLabel}>{tab.label}</span>
            </button>
          ))}
          <div className={styles.mobileMenuAuth}>
            <UserMenu onAuthSuccess={() => handleTabChange('tracker')} />
          </div>
        </div>
      </nav>

      <div className={styles.container}>
        {activeTab === 'calculator' && (
          <>
            <div className={styles.howToUse}>
              <h3 className={styles.howToUseTitle}>How to Use Enchanting Orbs</h3>
              <ol className={styles.howToUseSteps}>
                <li><strong>Right-click</strong> the orb in your inventory</li>
                <li><strong>Click</strong> the matching item type for that orb</li>
                <li><strong>Repeat</strong> until you reach your desired enchant level</li>
              </ol>
            </div>

            <div className={styles.grid}>
          {/* Input Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Item Configuration</h2>

            <div className={styles.inputGroup}>
              <ColorDropdown
                label="Item Quality"
                value={itemQuality}
                onChange={(value) => {
                  const newQuality = value as ItemQuality;
                  setItemQuality(newQuality);
                  if (currentLevel > MAX_ENCHANT[newQuality]) {
                    setCurrentLevel(0);
                  }
                }}
                options={Object.entries(ITEM_QUALITY_NAMES).map(([value, name]) => ({
                  value: Number(value),
                  label: name,
                  color: ITEM_QUALITY_COLORS[Number(value) as ItemQuality],
                }))}
              />
            </div>

            <div className={styles.inputGroup}>
              <ColorDropdown
                label="Orb Quality"
                value={orbQuality}
                onChange={(value) => setOrbQuality(value as OrbQuality)}
                options={Object.entries(ORB_QUALITY_NAMES).map(([value, name]) => ({
                  value: Number(value),
                  label: name,
                  color: ORB_QUALITY_COLORS[Number(value) as OrbQuality],
                }))}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Current Enchant Level (Max: +{maxEnchant})
              </label>
              <select
                className={styles.select}
                value={currentLevel}
                onChange={(e) => setCurrentLevel(Number(e.target.value))}
              >
                {Array.from({ length: maxEnchant + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? 'Unenchanted' : `+${i}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Next Enchant Analysis</h2>

            {currentLevel >= maxEnchant ? (
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Status</span>
                <span className={styles.maxEnchantBadge}>MAX ENCHANT REACHED</span>
              </div>
            ) : (
              <div className={styles.resultsGrid}>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>
                    +{currentLevel} → +{currentLevel + 1} Success Rate
                  </span>
                  <span
                    className={`${styles.resultValue} ${getRiskClass(calculations.riskLevel)}`}
                  >
                    {calculations.successRate.toFixed(1)}%
                  </span>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Risk Level</span>
                  <span
                    className={`${styles.resultValue} ${getRiskClass(calculations.riskLevel)}`}
                  >
                    {calculations.riskLevel.charAt(0).toUpperCase() +
                      calculations.riskLevel.slice(1)}
                  </span>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>
                    Expected Orbs to Max
                    <span className={styles.tooltip} title="This is an average estimate. Due to RNG, actual orbs needed may be higher or lower. Plan for ~20% extra orbs to be safe.">
                      ⓘ
                    </span>
                  </span>
                  <span className={styles.resultValue}>
                    {formatNumber(calculations.expectedOrbs)}
                  </span>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Recommended Orb</span>
                  <span className={styles.resultValue}>
                    <span className={styles.orbIndicator}>
                      <span
                        className={styles.orbDot}
                        style={{
                          backgroundColor: ORB_QUALITY_COLORS[calculations.recommendedOrb],
                        }}
                      />
                      {ORB_QUALITY_NAMES[calculations.recommendedOrb]}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Strategy Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Quick Stats</h2>
            <div className={styles.resultsGrid}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Item Quality</span>
                <span
                  className={styles.resultValue}
                  style={{ color: ITEM_QUALITY_COLORS[itemQuality] }}
                >
                  {ITEM_QUALITY_NAMES[itemQuality]}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Max Enchant</span>
                <span className={styles.resultValue}>+{maxEnchant}</span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Current Level</span>
                <span className={styles.resultValue}>
                  {currentLevel === 0 ? 'None' : `+${currentLevel}`}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Remaining Steps</span>
                <span className={styles.resultValue}>{maxEnchant - currentLevel}</span>
              </div>
            </div>
          </div>

          {/* Enchant Path Table */}
          <div className={`${styles.card} ${styles.fullWidth}`}>
            <h2 className={styles.cardTitle}>Full Enchant Path</h2>
            {calculations.steps.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                Item is already at maximum enchant level.
              </p>
            ) : (
              <table className={styles.stepsTable}>
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Success Rate</th>
                    <th>Expected Orbs</th>
                    <th>Risk</th>
                    <th>Recommended Orb</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.steps.map((step) => (
                    <tr key={step.fromLevel}>
                      <td>
                        +{step.fromLevel} → +{step.toLevel}
                      </td>
                      <td className={getRiskClass(step.riskLevel)}>
                        {step.successRate.toFixed(1)}%
                      </td>
                      <td>{formatNumber(step.expectedOrbs)}</td>
                      <td className={getRiskClass(step.riskLevel)}>
                        {step.riskLevel.charAt(0).toUpperCase() + step.riskLevel.slice(1)}
                      </td>
                      <td>
                        <span className={styles.orbIndicator}>
                          <span
                            className={styles.orbDot}
                            style={{
                              backgroundColor: ORB_QUALITY_COLORS[step.recommendedOrb],
                            }}
                          />
                          {ORB_QUALITY_NAMES[step.recommendedOrb]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Strategy Comparison */}
          <div className={`${styles.card} ${styles.fullWidth}`}>
            <StrategyComparison
              itemQuality={itemQuality}
              currentLevel={currentLevel}
            />
          </div>
        </div>
          </>
        )}

        {activeTab === 'simulator' && (
          <div className={styles.simulatorTab}>
            <SimulationResults
              itemQuality={itemQuality}
              orbQuality={orbQuality}
              currentLevel={currentLevel}
            />
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className={styles.authContent}>
            {isAuthenticated ? (
              <EnchantTracker />
            ) : (
              <AuthForm />
            )}
          </div>
        )}

      </div>

      {activeTab === 'leaderboard' && (
        <div className={styles.leaderboardFullWidth}>
          <Leaderboard />
        </div>
      )}

      {activeTab === 'admin' && adminCheck?.isModerator && (
        <div className={styles.leaderboardFullWidth}>
          <Admin />
        </div>
      )}

      {activeTab === 'guidelines' && (
        <div className={styles.leaderboardFullWidth}>
          <Guidelines />
        </div>
      )}

      {activeTab === 'terms' && (
        <div className={styles.leaderboardFullWidth}>
          <TermsOfService />
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className={styles.leaderboardFullWidth}>
          <PrivacyPolicy />
        </div>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerMain}>
            <div className={styles.footerGrid}>
              {/* Brand Column */}
              <div className={styles.footerColumn}>
                <h4 className={styles.footerHeading}>Dreadmyst Enchanting Tool</h4>
                <p className={styles.footerText}>
                  A community tool for calculating enchanting odds, tracking progress, and competing on the leaderboard.
                </p>
                <p className={styles.footerText}>
                  Built by <a href="https://isitp2w.com/" target="_blank" rel="noopener noreferrer" className={styles.footerInlineLink}>IsItP2W.com</a>
                </p>
              </div>

              {/* Resources Column */}
              <div className={styles.footerColumn}>
                <h4 className={styles.footerHeading}>Resources</h4>
                <div className={styles.footerLinks}>
                  <a href="https://isitp2w.com/games/dreadmyst" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
                    Dreadmyst on IsItP2W
                  </a>
                  <a href="https://docs.google.com/spreadsheets/d/1GxuInbx8yLYp4mnmaHgCMmRkSamrE_cBCYlzvg1pCqM/edit?usp=sharing" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
                    Game Info Spreadsheet
                  </a>
                  <a href="https://discord.gg/VTjve676D2" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
                    Discord Server
                  </a>
                </div>
              </div>

              {/* Legal Column */}
              <div className={styles.footerColumn}>
                <h4 className={styles.footerHeading}>Legal</h4>
                <div className={styles.footerLinks}>
                  <button onClick={() => handleTabChange('terms')} className={styles.footerLinkButton}>
                    Terms of Service
                  </button>
                  <button onClick={() => handleTabChange('privacy')} className={styles.footerLinkButton}>
                    Privacy Policy
                  </button>
                  <button onClick={() => handleTabChange('guidelines')} className={styles.footerLinkButton}>
                    Submission Guidelines
                  </button>
                </div>
              </div>

              {/* Contact Column */}
              <div className={styles.footerColumn}>
                <h4 className={styles.footerHeading}>Contact & Credits</h4>
                <p className={styles.footerText}>
                  Enchanting data by <strong>@sithadmin</strong>
                </p>
                <p className={styles.footerText}>
                  Issues? <a href="https://isitp2w.com/contact" target="_blank" rel="noopener noreferrer" className={styles.footerInlineLink}>Contact Us</a>
                </p>
                <p className={styles.footerTextSmall}>
                  Not affiliated with Dreadmyst developers.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>© 2026 IsItP2W.com — Jordan D Turner (JT Digital Systems)</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
