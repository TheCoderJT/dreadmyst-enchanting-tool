"use client";

import styles from "./TermsOfService.module.css";

export default function TermsOfService() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.lastUpdated}>Last Updated: January 2026</p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
          <p>
            By accessing and using the Dreadmyst Enchanting Tool ("Service"), you agree to be bound 
            by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Description of Service</h2>
          <p>
            The Dreadmyst Enchanting Tool is a community tool that provides enchanting calculations, 
            simulations, and tracking features for the game Dreadmyst. This Service is not affiliated 
            with or endorsed by the game developers.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. User Accounts</h2>
          <p>
            To use certain features of the Service, you may need to create an account. You are 
            responsible for maintaining the confidentiality of your account credentials and for 
            all activities that occur under your account.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className={styles.list}>
            <li>Submit false, misleading, or fraudulent information</li>
            <li>Manipulate or falsify screenshots or verification data</li>
            <li>Attempt to circumvent any security measures</li>
            <li>Use the Service for any unlawful purpose</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Interfere with the proper functioning of the Service</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Content Submission</h2>
          <p>
            By submitting content (including screenshots and item data) to the Service, you grant 
            us a non-exclusive, royalty-free license to use, display, and distribute that content 
            in connection with the Service. You represent that you have the right to submit such content.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Moderation and Enforcement</h2>
          <p>
            We reserve the right to remove any content and suspend or terminate accounts that 
            violate these Terms or our Submission Guidelines. Moderation decisions are made at 
            our discretion and may include warnings, temporary bans, or permanent bans.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" without warranties of any kind. We do not guarantee 
            the accuracy of calculations, the availability of the Service, or that the Service 
            will be error-free.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect, 
            incidental, special, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Continued use of the Service after changes 
            constitutes acceptance of the new Terms. We encourage you to review these Terms periodically.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Contact</h2>
          <p>
            For questions about these Terms or to report issues, please visit our contact page at{" "}
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
