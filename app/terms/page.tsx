import LegalLayout from "@/components/legal/LegalLayout";

export const metadata = { title: "Terms of Service — BookEasy" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 7, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of BookEasy
        (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these Terms.
      </p>

      <h2>1. Your account</h2>
      <p>
        You are responsible for the activity on your account and for keeping your login secure.
        You must provide accurate information and be at least 18 years old (or the age of majority
        in your jurisdiction).
      </p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>Do not use the Service for unlawful, harmful, or fraudulent purposes.</li>
        <li>Do not send spam or abuse the booking, email, or SMS features.</li>
        <li>Do not attempt to disrupt or reverse-engineer the Service.</li>
      </ul>

      <h2>3. Bookings and payments</h2>
      <p>
        BookEasy provides scheduling tools. When you enable payments, transactions are processed by
        Stripe and are subject to Stripe&rsquo;s terms. You are responsible for honoring bookings, your
        own refund/cancellation policy, and any taxes due on payments you collect.
      </p>

      <h2>4. Subscriptions</h2>
      <p>
        Paid plans renew automatically until cancelled. You can cancel anytime from Settings &rarr; Billing;
        access continues until the end of the current billing period. Fees are non-refundable except where
        required by law.
      </p>

      <h2>5. Third-party services</h2>
      <p>
        The Service integrates with providers such as Google Calendar, Resend, Twilio, and Stripe. Your use
        of those features is also subject to those providers&rsquo; terms.
      </p>

      <h2>6. Availability and changes</h2>
      <p>
        We may modify or discontinue features at any time. We aim for high availability but do not guarantee
        the Service will be uninterrupted or error-free.
      </p>

      <h2>7. Disclaimer and liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum extent permitted
        by law, BookEasy is not liable for indirect, incidental, or consequential damages, or for missed,
        double-booked, or cancelled appointments.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using the Service at any time and delete your account from Settings. We may suspend or
        terminate accounts that violate these Terms.
      </p>

      <h2>9. Contact</h2>
      <p>Questions about these Terms? Contact us at support@bookeasy.app.</p>

      <p className="text-xs text-gray-400">
        This is a general template and not legal advice. Have a lawyer review it before relying on it commercially.
      </p>
    </LegalLayout>
  );
}
