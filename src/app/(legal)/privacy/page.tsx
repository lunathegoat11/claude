import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, legalParties } from "@/components/legal/legal-doc";
import { env } from "@/server/env";
import { AI_SERVICES, AI_SERVICE_IDS } from "@/lib/ai-services";
import { serverAiLabel } from "@/server/services/ai-settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Kosha Health handles your health information: what we collect, why, who else handles it, how long it is kept, and your rights under India's DPDP Act.",
};

export default function PrivacyPage() {
  const p = legalParties();
  const e = env();
  const serverAi = serverAiLabel();
  const email = e.EMAIL_PROVIDER === "resend" ? "Resend (email delivery)" : null;
  const link = "text-primary underline underline-offset-2";
  return (
    <LegalDoc
      title="Privacy Policy"
      intro={
        <p>
          Kosha Health (&quot;Kosha&quot;) is operated by {p.org} (&quot;we&quot;). Your health
          information is personal and sensitive. This policy explains, in plain language, what we
          collect, why, who else handles it and the choices you have. It is written for India&apos;s
          Digital Personal Data Protection Act, 2023 (DPDP Act) and its Rules.
        </p>
      }
    >
      <section>
        <h2>1. The short version</h2>
        <ul>
          <li>You decide what health information to add. We use it only to run Kosha for you.</li>
          <li>We do not sell your data, and we don&apos;t use it for advertising or profiling.</li>
          <li>
            Your records are private to your account. We don&apos;t share them with doctors,
            hospitals, insurers or employers. The companies that run Kosha for us (listed in section
            6) handle them only on our instructions.
          </li>
          <li>
            AI is optional. Nothing is sent to an AI company unless you switch it on, and you can
            switch it off again at any time.
          </li>
          <li>
            You can download your data or delete your account, and everything in it, at any time.
          </li>
          <li>
            If you choose, corrections you make to values Kosha read from a report help it read
            reports better. Only the kind of mistake is kept, never your values.
          </li>
          <li>We keep nothing for longer than it&apos;s needed.</li>
          <li>There are no ads, analytics or tracking tools in Kosha.</li>
        </ul>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and password. The password is
            stored only as a one-way hash, so nobody can read it.
          </li>
          <li>
            <strong>If you sign in with Google or Apple:</strong> the ID of your account with them,
            your email address and, if you choose to share it, your name. We never see your Google
            or Apple password. Apple may give us a private relay address instead of your real email.
          </li>
          <li>
            <strong>Health information you add:</strong> medical records, uploaded reports and
            photos, the text read from them, lab results, health readings, medicines, allergies,
            conditions, and questions you ask the assistant with its answers.
          </li>
          <li>
            <strong>Optional profile details:</strong> date of birth, sex, blood group, height,
            phone number, city/state and an emergency contact, only if you choose to add them.
          </li>
          <li>
            <strong>Consent records:</strong> when you accepted these terms, gave consent to process
            health data, confirmed you are 18 or older, and switched AI on or off, with the version
            of the terms you saw.
          </li>
          <li>
            <strong>Security information:</strong> your signed-in devices with a short label (for
            example &ldquo;Chrome on Android&rdquo;), and a log of account activity (for example
            &ldquo;signed in&rdquo; or &ldquo;uploaded a document&rdquo;) with dates. The log never
            contains your health information.
          </li>
          <li>
            <strong>Your device&apos;s time zone</strong> (for example &ldquo;Asia/Kolkata&rdquo;),
            read from your phone or computer&apos;s settings so dates and times show correctly. We
            don&apos;t use your location or GPS.
          </li>
          <li>
            <strong>Your IP address</strong> is used for a short time, in memory only, to stop
            people guessing passwords or flooding the service. It is not saved.
          </li>
          <li>
            <strong>Photos you upload</strong> are stored without their hidden details, such as the
            GPS location and phone model that cameras add.
          </li>
        </ul>
        <p>We do not ask for Aadhaar, ABHA or any other government ID number.</p>
      </section>

      <section>
        <h2>3. Why we use it</h2>
        <ul>
          <li>
            To store, organise and show your health information to you (dashboards, charts,
            timeline, search).
          </li>
          <li>
            To read test results from reports you upload. The values are saved automatically and
            marked for checking; please compare them with the original report, and correct them if
            anything was misread.
          </li>
          <li>To answer your questions in the assistant, using only your own records.</li>
          <li>
            Only if you choose: to learn from your corrections so Kosha reads reports better
            (section 5).
          </li>
          <li>
            To keep your account secure, prevent abuse, and send account emails (verification and
            password resets). Emails never contain health information.
          </li>
        </ul>
        <p>
          We process your health information because you consent to it when you create your account.
          Using AI and learning from your corrections are separate, optional consents. You can
          withdraw any of them at any time (see section 10).
        </p>
      </section>

      <section>
        <h2>4. AI and automatic reading</h2>
        <p>
          Kosha reads uploaded reports on its own server, using text recognition software that runs
          here. Nothing is sent elsewhere to do this.
        </p>
        <p>AI is used only if you choose it, in one of two ways:</p>
        <ul>
          {serverAi ? (
            <li>
              <strong>The AI service set up for this server ({serverAi}).</strong> Off unless you
              switch on &ldquo;Use AI for answers&rdquo; in Settings → AI helper. When on, your
              question, your recent messages in that conversation and the records related to it are
              sent to {serverAi} to write the answer. Uploaded reports may also be sent to it to be
              read. {serverAi} is located outside India and acts on our instructions.
            </li>
          ) : (
            <li>
              <strong>This server has no AI service of its own.</strong> Without your own key, the
              assistant answers with simple summaries built from your records on this server, and
              nothing is sent to an AI company.
            </li>
          )}
          <li>
            <strong>Your own AI key.</strong> You can add a key from one AI service of your choice:{" "}
            {AI_SERVICE_IDS.map((id) => AI_SERVICES[id].label).join(", ")}. Your questions and
            related records are then sent to your account with that company, and your uploaded
            reports are sent too only if you tick that option. That company handles them under its
            own terms with you, and may process them outside India. Some services, such as
            OpenRouter, pass requests on to other AI companies. Your key is encrypted before it is
            stored, is only ever sent to that service&apos;s official address, and is never shown
            again.
          </li>
        </ul>
        <p>
          Every answer is labelled with what wrote it: an AI service, or Kosha&apos;s automatic
          summary. The assistant cannot change your records, does not give medical advice, and can
          be wrong. Kosha is not affiliated with any of these AI companies.
        </p>
      </section>

      <section>
        <h2>5. Learning from your corrections (optional)</h2>
        <p>
          This is off unless you tick it when you sign up or switch on &ldquo;Learn from my
          corrections&rdquo; in Settings → Privacy &amp; security. You can switch it off at any
          time.
        </p>
        <p>
          When it is on and you correct values Kosha read from a report, Kosha compares, in memory,
          what it read with what you saved, and keeps only the kind of mistake it made:
        </p>
        <ul>
          <li>a character it misread, for example a 7 read as a 1;</li>
          <li>a line that isn&apos;t a test result, such as &ldquo;Received&rdquo;;</li>
          <li>a test name it didn&apos;t recognise, and which test it really was.</li>
        </ul>
        <p>
          The comparison is thrown away as soon as this is done. Nothing kept for learning contains
          your values, name, dates, reports or account. Lines and test names are kept only in a
          scrambled (hashed) form, and only once three different people have made the same
          correction. Until then they are held briefly in the server&apos;s memory, and are
          forgotten after a day at most, when the server restarts, or when you switch learning off.
          The patterns learned are anonymous and are used only to read reports better for everyone.
          They are never sent to another company or used to train an AI model, and they can&apos;t
          be traced back to you, so they can&apos;t be deleted with your account. Your corrected
          report itself stays in your records as usual.
        </p>
      </section>

      <section>
        <h2>6. Who handles your data</h2>
        <p>We do not sell or rent your information. Besides us, it is handled only by:</p>
        <ul>
          <li>
            <strong>Companies that run Kosha for us:</strong> {p.hosts}
            {email ? `, and ${email}` : ""}. They process data only to provide their service to us.
          </li>
          {serverAi && (
            <li>
              <strong>{serverAi}</strong>, only if you switch AI on (section 4).
            </li>
          )}
          <li>
            <strong>Paddle</strong> (paddle.com), only if you buy Kosha Plus. Paddle sells the plan to
            you and takes the payment: your card, UPI or bank details go straight to Paddle, and we
            never see them. We receive only your plan, whether it is paid up, and Paddle&apos;s
            reference numbers for you and your payments. Paddle keeps payment records as tax law
            requires, under its own privacy policy. No health information is ever sent to Paddle.
          </li>
          <li>
            <strong>Google or Apple</strong>, only if you choose to sign in with them: they confirm
            who you are, and learn that you use Kosha Health.
          </li>
          <li>
            <strong>Authorities</strong>, only where Indian law requires it.
          </li>
        </ul>
        <p>
          People who maintain this service can technically access the database to keep it running.
          They may only do so when needed for that, and access is limited.
        </p>
      </section>

      <section>
        <h2>7. Where and how it is stored</h2>
        <p>
          Your information is stored in {p.location}. If you switch on an AI service, the
          information sent to it may be processed in other countries, such as the United States.
        </p>
        <p>
          Connections to Kosha are encrypted (HTTPS). Passwords are hashed, AI keys are encrypted,
          documents are only shown after checking your sign-in, and account activity is logged.
          Records and files are protected by the security of the servers they are stored on; Kosha
          does not add its own extra layer of encryption to them. No system is perfectly secure, and
          we don&apos;t claim certification under HIPAA, ISO 27001 or any similar scheme.
        </p>
      </section>

      <section>
        <h2>8. Cookies and storage on your device</h2>
        <p>
          Kosha uses one essential cookie to keep you signed in. It lasts up to 30 days while you
          use Kosha, and never more than 90 days in total. Your device also remembers a few display
          choices (theme, transparency, which chart ranges you show). There are no advertising or
          tracking cookies, so no cookie banner is needed.
        </p>
      </section>

      <section>
        <h2>9. How long we keep it</h2>
        <ul>
          <li>
            We keep your information only while it is needed: while your account is open, so you can
            see it.
          </li>
          <li>
            When you delete something (a record, report, result, reading or document), it is removed
            for good at once, including any uploaded file and the text read from it.
          </li>
          <li>
            When you correct a report, the old values are replaced at once and not kept. If learning
            from corrections is on, the comparison is thrown away as soon as the anonymous pattern
            is noted (section 5).
          </li>
          <li>
            When you delete your account, everything is removed at once, including files and the
            activity log. Copies in backups are removed within {p.backupDays} days.
          </li>
          <li>
            Removed automatically while your account is open: expired sign-ins when they expire,
            email links a day after they are used or expire, and the activity log after one year.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Your rights</h2>
        <ul>
          <li>
            <strong>Access and portability:</strong> see your information in the app, or download it
            in one file (Settings → Privacy &amp; security → Download my data). Uploaded files are
            downloaded one by one from Reports &amp; files.
          </li>
          <li>
            <strong>Correction:</strong> edit or delete any record yourself.
          </li>
          <li>
            <strong>Erasure:</strong> delete your account and everything in it (Settings → Privacy
            &amp; security).
          </li>
          <li>
            <strong>Withdraw consent:</strong> switch AI off at any time in Settings → AI helper,
            and learning from corrections off in Settings → Privacy &amp; security. To withdraw
            consent to all processing, delete your account. Withdrawing doesn&apos;t affect what was
            done before.
          </li>
          <li>
            <strong>Nominate</strong> someone to act for you if you die or can&apos;t act yourself,
            by writing to the Grievance Officer.
          </li>
          <li>
            <strong>Complain:</strong> to our Grievance Officer (section 13). If you&apos;re not
            satisfied, you can complain to the Data Protection Board of India.
          </li>
        </ul>
        <p>
          If you live outside India, you have at least these same rights. We do not
          &ldquo;sell&rdquo; or &ldquo;share&rdquo; personal information as California law defines
          those words.
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>
          Kosha is only for adults (18+), and asks you to confirm this. A child&apos;s records
          should be kept by a parent or legal guardian in the guardian&apos;s own account. If we
          learn that an account belongs to someone under 18, we will close it.
        </p>
      </section>

      <section>
        <h2>12. Data breaches</h2>
        <p>
          If a security incident affects your personal data, we will tell you without delay, in
          plain language, what happened, what it may mean for you and what we are doing about it. We
          will also report it to the Data Protection Board of India as the DPDP Act and Rules
          require.
        </p>
      </section>

      <section>
        <h2>13. Grievance Officer and contact</h2>
        <p>
          {p.officer}, Grievance Officer,{" "}
          <a className={link} href={`mailto:${p.officerEmail}`}>
            {p.officerEmail}
          </a>
          , {p.officerAddress}. We will acknowledge your complaint promptly and resolve it within
          the time the law requires. General questions: {p.contact}.
        </p>
      </section>

      <section>
        <h2>14. Changes to this policy</h2>
        <p>
          If we make important changes, we will show you the new version in the app and ask you to
          accept it before you continue.
        </p>
        <p>
          See also our{" "}
          <Link href="/terms" className={link}>
            Terms of Use
          </Link>{" "}
          and the{" "}
          <a href="/licenses/THIRD_PARTY_NOTICES.txt" className={link}>
            open-source notices
          </a>
          .
        </p>
      </section>
    </LegalDoc>
  );
}
