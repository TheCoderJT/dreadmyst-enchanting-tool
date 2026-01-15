"use client";

import styles from "./PrivacyPolicy.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last Updated: January 2026</p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className={styles.list}>
            <li><strong>Account Information:</strong> Email address and display name when you create an account</li>
            <li><strong>Usage Data:</strong> Enchanting session data, item tracking information, and leaderboard submissions</li>
            <li><strong>Uploaded Content:</strong> Screenshots submitted for verification purposes</li>
            <li><strong>Technical Data:</strong> Browser type, device information, and IP address for security purposes</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul className={styles.list}>
            <li>Provide and maintain the Service</li>
            <li>Display your submissions on the public leaderboard</li>
            <li>Verify screenshot authenticity</li>
            <li>Enforce our Terms of Service and Submission Guidelines</li>
            <li>Improve and optimize the Service</li>
            <li>Communicate with you about your account or the Service</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Information Sharing</h2>
          <p>
            We do not sell your personal information. We may share information in the following circumstances:
          </p>
          <ul className={styles.list}>
            <li><strong>Public Leaderboard:</strong> Your display name, item data, and verification status are publicly visible</li>
            <li><strong>Service Providers:</strong> We use third-party services (Convex for database, cloud storage for screenshots) that process data on our behalf</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Data Storage and Security</h2>
          <p>
            Your data is stored securely using industry-standard practices. We use encrypted connections 
            and secure authentication. However, no method of transmission over the Internet is 100% secure, 
            and we cannot guarantee absolute security.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Data Retention</h2>
          <p>
            We retain your account data and submissions for as long as your account is active. 
            You may delete your completed items at any time. If you wish to delete your account 
            entirely, please contact us.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className={styles.list}>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your submissions and account</li>
            <li>Object to certain processing of your data</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Cookies and Local Storage</h2>
          <p>
            We use cookies and local storage for authentication and to remember your preferences. 
            These are essential for the Service to function properly.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for children under 13 years of age. We do not knowingly 
            collect personal information from children under 13.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes 
            by updating the "Last Updated" date. Continued use of the Service constitutes acceptance 
            of the updated policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise your data rights, 
            please contact us at{" "}
            <a 
              href="https://isitp2w.com/contact" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              isitp2w.com/contact
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
