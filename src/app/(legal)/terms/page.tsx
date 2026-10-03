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
          <Link href="/privacy" className="text-primary hover:underline">
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
          The assistant and the automatic reading of reports can make mistakes. Answers are based
          only on your records and are labelled as AI-generated. Do not make medical decisions based
          on them without consulting a doctor.
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
        <h2>6. Availability</h2>
        <p>
          We work to keep Kosha available and your data safe, but the service is provided &quot;as
          is&quot;. Keep your original medical documents — Kosha is not a substitute for official
          medical records.
        </p>
      </section>
      <section>
        <h2>7. Liability</h2>
        <p>
          To the extent permitted by law, {p.org} is not liable for decisions made based on
          information in Kosha, or for indirect losses. [Liability terms to be completed by legal
          counsel.]
        </p>
      </section>
      <section>
        <h2>8. Ending your use</h2>
        <p>
          You can delete your account at any time. We may suspend accounts that break these terms,
          and will tell you why where we can.
        </p>
      </section>
      <section>
        <h2>9. Changes and law</h2>
        <p>
          We will tell you about important changes to these terms. These terms are governed by the
          laws of India, and the courts of [city] have jurisdiction. Questions: {p.contact}.
          Grievances: {p.officer} ({p.officerEmail}).
        </p>
      </section>
    </LegalDoc>
  );
}
