import LegalLayout from "@/components/legal/LegalLayout";

export const metadata = { title: "Privacy Policy — BookEasy" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 7, 2026">
      <p>
        This Privacy Policy explains what information BookEasy collects, how we use it, and the choices
        you have. We aim to collect only what we need to run the scheduling service.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, profile photo, timezone, and (if you sign in with Google) your Google account ID and calendar tokens.</li>
        <li><strong>Booking data:</strong> event types, availability, bookings, invitee name/email/phone, and any answers to questions you configure.</li>
        <li><strong>Payment data:</strong> processed by Stripe. We store only identifiers and status — never full card numbers.</li>
        <li><strong>Usage data:</strong> basic logs needed to operate and secure the Service.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create and manage bookings and calendar events.</li>
        <li>To send confirmations, reminders, and notifications by email/SMS.</li>
        <li>To process subscription and booking payments.</li>
        <li>To secure, maintain, and improve the Service.</li>
      </ul>

      <h2>Google user data</h2>
      <p>
        With your permission we access your Google Calendar to create events and read free/busy times to
        prevent double-bookings. We use this access only to provide scheduling features and do not sell it.
        You can revoke access anytime in your Google Account settings.
      </p>

      <h2>Sharing</h2>
      <p>
        We share data only with service providers that power the product — Google, Stripe, Resend (email),
        Twilio (SMS), Supabase (database hosting), and Vercel (app hosting) — strictly to deliver the Service.
        We do not sell your personal data.
      </p>

      <h2>Data retention &amp; your rights</h2>
      <p>
        You can export your data or permanently delete your account at any time from Settings &rarr; Privacy.
        Deleting your account removes your profile, event types, availability, and bookings. Depending on your
        location you may have rights to access, correct, or erase your data (e.g. under GDPR/CCPA).
      </p>

      <h2>Security</h2>
      <p>
        We use encryption in transit and reputable infrastructure providers. No system is perfectly secure,
        but we work to protect your information.
      </p>

      <h2>Contact</h2>
      <p>Privacy questions? Contact us at privacy@bookeasy.app.</p>

      <p className="text-xs text-gray-400">
        This is a general template and not legal advice. Have a professional review it before relying on it commercially.
      </p>
    </LegalLayout>
  );
}
