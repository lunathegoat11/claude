import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, legalParties } from "@/components/legal/legal-doc";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const p = legalParties();
  return (
    <LegalDoc
      title="Privacy Policy"
      intro={
        <p>
          Kosha is operated by {p.org} (&quot;we&quot;). Your health information is personal and
          sensitive. This policy explains, in plain language, what we collect, why, and the choices
          you have. It is written with India&apos;s Digital Personal Data Protection Act, 2023 in
          mind.
        </p>
      }
    >
      <section>
        <h2>1. The short version</h2>
        <ul>
          <li>
            You decide what health information to add. We use it only to provide Kosha to you.
          </li>
          <li>We do not sell your data and do not use it for advertising.</li>
          <li>
            Only you can see your records. We don&apos;t share them with doctors, hospitals,
            insurers or employers.
          </li>
          <li>You can download everything or delete your account at any time.</li>
        </ul>
      </section>
      <section>
        <h2>2. What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and password (stored only as
            a secure, one-way hash).
          </li>
          <li>
            <strong>Health information you add:</strong> medical records, uploaded documents, lab
            results, health readings, medications, allergies, conditions, and questions you ask the
            assistant.
          </li>
          <li>
            <strong>Optional profile details:</strong> date of birth, sex, blood group, height,
            phone number, city/state and an emergency contact — only if you choose to add them.
          </li>
          <li>
            <strong>Security information:</strong> sign-in sessions, the type of device/browser, and
            a scrambled (pseudonymised) form of your IP address in our security log. The security
            log never contains your health information.
          </li>
        </ul>
        <p>We do not ask for Aadhaar, ABHA or other government ID numbers.</p>
      </section>
      <section>
        <h2>3. Why we use it</h2>
        <ul>
          <li>
            To store, organise and display your health information to you (dashboards, charts,
            timeline, search).
          </li>
          <li>
            To read values from reports you upload, which you then review before anything is saved.
          </li>
          <li>To answer your questions in the assistant, using only your own records.</li>
          <li>
            To keep your account secure, prevent abuse and send account emails (like password
            resets).
          </li>
        </ul>
        <p>
          We process your health information on the basis of the consent you give when you create
          your account. You can withdraw consent at any time by deleting your account (Profile &amp;
          Settings → Privacy &amp; security).
        </p>
      </section>
      <section>
        <h2>4. The AI assistant</h2>
        <p>
          The assistant only looks at the records relevant to each question. Depending on how this
          service is configured, answers are created either on our own servers or by an AI provider
          we contract with ([name of AI provider, if any]). When an external provider is used, only
          the relevant parts of your records are sent to it, for the purpose of answering your
          question, under an agreement that restricts their use of your data. The assistant cannot
          change your records and does not give medical advice.
        </p>
      </section>
      <section>
        <h2>5. Who we share it with</h2>
        <p>We do not sell or rent your information. We share it only with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> who help us run Kosha — hosting, file storage, email
            delivery and (if enabled) the AI provider — under contracts requiring them to protect
            it: [list providers].
          </li>
          <li>
            <strong>Authorities</strong>, only where Indian law requires it.
          </li>
        </ul>
      </section>
      <section>
        <h2>6. Where and how it is stored</h2>
        <p>
          Your information is stored in [location of servers, e.g. Mumbai, India]. Documents are
          stored privately and are only shown to you after checking your sign-in. Connections are
          encrypted, passwords are hashed, and access is logged.
        </p>
      </section>
      <section>
        <h2>7. How long we keep it</h2>
        <p>
          We keep your information while your account is active. When you delete a document, the
          file is removed immediately. When you delete your account, all your records and files are
          deleted; copies in backups are removed within [30] days.
        </p>
      </section>
      <section>
        <h2>8. Your rights</h2>
        <ul>
          <li>
            <strong>Access:</strong> see your information in the app, or download it all (Profile
            &amp; Settings → Privacy &amp; security → Download my data).
          </li>
          <li>
            <strong>Correction:</strong> edit or delete any record yourself.
          </li>
          <li>
            <strong>Erasure:</strong> delete your account and everything in it.
          </li>
          <li>
            <strong>Withdraw consent:</strong> at any time, by deleting your account.
          </li>
          <li>
            <strong>Nominate</strong> someone to exercise these rights on your behalf in case of
            death or incapacity, by writing to us.
          </li>
          <li>
            <strong>Complain:</strong> to our Grievance Officer (below), and if you&apos;re not
            satisfied, to the Data Protection Board of India.
          </li>
        </ul>
      </section>
      <section>
        <h2>9. Children</h2>
        <p>
          Kosha is for adults (18+). A child&apos;s records should be managed by a parent or legal
          guardian through their own account.
        </p>
      </section>
      <section>
        <h2>10. Data breaches</h2>
        <p>
          If a security incident affects your information, we will inform you and the authorities as
          required by law.
        </p>
      </section>
      <section>
        <h2>11. Grievance Officer and contact</h2>
        <p>
          {p.officer}, Grievance Officer —{" "}
          <a className="text-primary hover:underline" href={`mailto:${p.officerEmail}`}>
            {p.officerEmail}
          </a>
          . We will acknowledge your complaint and respond within the time required by law. General
          questions: {p.contact}.
        </p>
      </section>
      <section>
        <h2>12. Changes to this policy</h2>
        <p>
          If we make important changes, we will tell you in the app and ask for your consent again
          where required.
        </p>
        <p>
          See also our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Use
          </Link>
          .
        </p>
      </section>
    </LegalDoc>
  );
}
