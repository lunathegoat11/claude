import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, legalParties } from "@/components/legal/legal-doc";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  const p = legalParties();
  return (
    <LegalDoc
      title="Terms of Use"
      intro={
        <p>
          These terms are an agreement between you and {p.org} for using Kosha. Please read them,
          together with our{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      }
    >
      <section>
        <h2>1. What Kosha is — and isn&apos;t</h2>
        <p>Kosha is a tool to store, organise and understand your own health information.</p>
        <ul>
          <li>
            <strong>
              Kosha is not a doctor and does not give medical advice, diagnosis or treatment.
            </strong>{" "}
            Always consult a qualified healthcare professional about your health.
          </li>
          <li>
            <strong>Kosha is not for emergencies.</strong> In an emergency call 112 (or 108 for an
            ambulance).
          </li>
          <li>
            Kosha is not connected to any government system (including ABDM) or hospital, unless we
            say otherwise in the app.
          </li>
          <li>
            The general ranges shown on charts (from Indian and US health agencies) are for
            information only. They are not a diagnosis, and your doctor may use different targets
            for you.
          </li>
        </ul>
      </section>
      <section>
        <h2>2. Who can use it</h2>
        <p>
          You must be 18 or older. Keep your password private; you are responsible for activity on
          your account. Tell us at {p.contact} if you think someone else has accessed it.
        </p>
      </section>
      <section>
        <h2>3. Your information</h2>
        <p>
          Your records belong to you. You give us permission to store and process them only to
          provide Kosha to you, as described in the Privacy Policy. You are responsible for the
          accuracy of what you enter — please check values against your original reports, especially
          values read automatically from uploaded documents or photos.
        </p>
      </section>
      <section>
        <h2>4. The AI assistant and automatic reading</h2>
        <p>
          The assistant and the automatic reading of reports can make mistakes, including reading a
          number wrongly. Always check values against the original report. Answers are based only on
          your records, and each one is labelled with what wrote it (an AI service or Kosha&apos;s
          automatic summary). Do not make medical decisions based on them without consulting a
          doctor.
        </p>
        <p>
          AI is optional and off unless you switch it on. If you use your own AI key, your use of
          that AI service is also governed by your agreement with its provider, and you must follow
          its usage policies. Kosha is not affiliated with, or endorsed by, Anthropic, OpenAI or any
          health agency whose guidance it cites.
        </p>
      </section>
      <section>
        <h2>5. Acceptable use</h2>
        <ul>
          <li>
            Only add your own information, or information you are legally allowed to manage (for
            example, as a parent or guardian).
          </li>
          <li>
            Don&apos;t try to access other people&apos;s accounts, disrupt the service, or upload
            harmful files.
          </li>
        </ul>
      </section>
      <section>
        <h2>6. Learning from corrections</h2>
        <p>
          If you choose to let Kosha learn from your corrections, you allow it to keep the anonymous
          patterns described in the Privacy Policy (section 5) and use them to read reports better
          for everyone. Those patterns contain none of your health information and can&apos;t be
          linked to you. You can stop this at any time in Settings; patterns already learned stay,
          because they can&apos;t be traced back to you.
        </p>
      </section>
      <section>
        <h2>7. Price</h2>
        <p>
          Kosha is free to use. It has no paid plans, subscriptions or in-app purchases, and never
          asks for payment details. If you add your own AI key, the AI company may charge you
          directly for what you use, under your agreement with them.
        </p>
      </section>
      <section>
        <h2>8. Availability</h2>
        <p>
          We work to keep Kosha available and your data safe, but the service is provided &quot;as
          is&quot;. Keep your original medical documents — Kosha is not a substitute for official
          medical records.
        </p>
      </section>
      <section>
        <h2>9. Liability</h2>
        <p>
          To the extent permitted by law, {p.org} is not liable for decisions made based on
          information in Kosha, for errors in values read automatically or answers written by AI, or
          for indirect losses. Nothing in these terms limits liability that cannot be limited under
          Indian law, including your rights as a consumer.
        </p>
      </section>
      <section>
        <h2>10. Open-source software</h2>
        <p>
          Kosha is built with open-source software, used under its licences. See the{" "}
          <a
            href="/licenses/THIRD_PARTY_NOTICES.txt"
            className="text-primary underline underline-offset-2"
          >
            open-source notices
          </a>
          .
        </p>
      </section>
      <section>
        <h2>11. Ending your use</h2>
        <p>
          You can delete your account at any time. We may suspend accounts that break these terms,
          and will tell you why where we can.
        </p>
      </section>
      <section>
        <h2>12. Changes and law</h2>
        <p>
          We will show you important changes to these terms in the app and ask you to accept them
          before you continue. These terms are governed by the laws of India, and the courts of{" "}
          {p.city} have jurisdiction. Questions: {p.contact}. Grievances: {p.officer} (
          {p.officerEmail}).
        </p>
      </section>
    </LegalDoc>
  );
}
