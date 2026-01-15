"use client";

import styles from "./Guidelines.module.css";

export default function Guidelines() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Submission Guidelines</h1>
      <p className={styles.subtitle}>
        Please read and follow these guidelines to ensure fair and accurate leaderboard data.
      </p>

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📸</span>
            Screenshot Requirements
          </h2>
          <ul className={styles.rulesList}>
            <li>
              <strong>Item Tooltip Only</strong>
              <p>Screenshots should only show the item tooltip when hovering over the item in-game. Do not include the full game screen - just the tooltip popup.</p>
            </li>
            <li>
              <strong>Unedited Screenshots Only</strong>
              <p>Screenshots must be original, unedited game captures. Do not use image editing software (Photoshop, GIMP, Paint.NET, etc.) to modify screenshots.</p>
            </li>
            <li>
              <strong>Item Name & Level Visible</strong>
              <p>The item name and enchant level (+X) must be clearly visible at the top of the tooltip.</p>
            </li>
          </ul>
          <div className={styles.exampleContainer}>
            <p className={styles.exampleLabel}>Example Screenshot:</p>
            <img 
              src="/example-tooltip.png" 
              alt="Example item tooltip showing Radiant Cap of Warm Vim +3"
              className={styles.exampleImage}
            />
            <p className={styles.exampleCaption}>
              This is the correct format - just the item tooltip with the name and +level visible.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>✅</span>
            Valid Submissions
          </h2>
          <ul className={styles.rulesList}>
            <li>
              <strong>Accurate Item Names</strong>
              <p>Item names must match valid in-game affixes. Use the autocomplete dropdown to ensure accuracy.</p>
            </li>
            <li>
              <strong>Correct Rarity Selection</strong>
              <p>The selected item quality must match the rarity prefix in the item name (e.g., "Godly Sword" = Godly quality).</p>
            </li>
            <li>
              <strong>Multiple Characters Allowed</strong>
              <p>You may submit the same item type multiple times if you have it on different characters. Each submission should be verified with a unique screenshot.</p>
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🚫</span>
            Prohibited Actions
          </h2>
          <ul className={styles.rulesList}>
            <li>
              <strong>No Fake Data</strong>
              <p>Do not submit fabricated enchanting results or manipulated statistics.</p>
            </li>
            <li>
              <strong>No Impersonation</strong>
              <p>Do not impersonate other players or use misleading display names.</p>
            </li>
            <li>
              <strong>No Offensive Content</strong>
              <p>Display names and item names must not contain profanity, slurs, hate speech, or inappropriate content.</p>
            </li>
            <li>
              <strong>No Exploits</strong>
              <p>Do not exploit bugs, glitches, or vulnerabilities in the tracking system.</p>
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>⚖️</span>
            Enforcement Policy
          </h2>
          <div className={styles.enforcementGrid}>
            <div className={styles.enforcementCard}>
              <span className={styles.strikeNumber}>1st</span>
              <span className={styles.strikeLabel}>Offense</span>
              <span className={styles.strikePenalty}>Warning</span>
              <p>A formal warning will be issued. The offending submission may be removed.</p>
            </div>
            <div className={styles.enforcementCard}>
              <span className={styles.strikeNumber}>2nd</span>
              <span className={styles.strikeLabel}>Offense</span>
              <span className={styles.strikePenalty}>7-Day Ban</span>
              <p>Temporary suspension from submitting new items or verifying screenshots.</p>
            </div>
            <div className={styles.enforcementCard}>
              <span className={styles.strikeNumber}>3rd</span>
              <span className={styles.strikeLabel}>Offense</span>
              <span className={styles.strikePenalty}>Permanent Ban</span>
              <p>Permanent removal from the leaderboard and tracking system.</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>❓</span>
            Questions or Appeals
          </h2>
          <p className={styles.contactText}>
            If you believe you were banned unfairly or have questions about these guidelines, 
            please contact the moderation team through The Official IsItP2W Discord server.
          </p>
          <a 
            href="https://discord.gg/VTjve676D2" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.discordLink}
          >
            <svg className={styles.discordIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Discord
          </a>
        </section>
      </div>

      <div className={styles.footer}>
        <p>Last updated: January 2026</p>
        <p>These guidelines are subject to change. Continued use of the tracker constitutes acceptance of these terms.</p>
      </div>
    </div>
  );
}
