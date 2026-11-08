import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage, Section } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Terms · Shuin" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of use" updated="8 November 2026">
      <p>By making a Shuin account you agree to these terms. They&apos;re short, promise.</p>

      <Section title="Your account">
        <ul className="list-disc pl-5">
          <li>You need to be 13 or older.</li>
          <li>Keep your password to yourself; you&apos;re responsible for what your account does.</li>
          <li>One person per account. No bots or automated scraping.</li>
        </ul>
      </Section>

      <Section title="Be decent">
        <p>
          Usernames, display names, bios and photos are public. Don&apos;t post anything hateful,
          sexual, threatening, illegal, or anything that pretends to be someone else. Don&apos;t
          try to break, overload or cheat the app (including faking XP). Accounts that do can be
          suspended or removed.
        </p>
      </Section>

      <Section title="Your stuff">
        <p>
          What you log and upload stays yours. You let Shuin store and show it so the app works
          (for example on your public profile and leaderboards). Delete it and it stops being
          shown.
        </p>
      </Section>

      <Section title="The fine print">
        <p>
          Shuin is a free app made by one person and is provided as it is. Titles, lengths and
          covers come from public databases and can be wrong. Features may change, and the service
          may occasionally be down. As far as the law allows, Shuin isn&apos;t liable for lost
          data or other indirect losses from using it.
        </p>
      </Section>

      <Section title="Questions">
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-400 hover:underline">{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </InfoPage>
  );
}
