import type { Metadata } from "next";
import { CONTACT_EMAIL, InfoPage, Section } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Privacy · Shuin" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy" updated="8 November 2026">
      <p>
        The short version: Shuin keeps what it needs to run your account and your Dex, shows your
        profile and Dex publicly, and doesn&apos;t sell your data, run ads or track you around the
        web.
      </p>

      <Section title="What Shuin stores">
        <ul className="list-disc pl-5">
          <li>Your email address and a scrambled (hashed) version of your password.</li>
          <li>Your username, display name, bio, banner choice, favourites and profile photo.</li>
          <li>What you log: titles, status, progress, ratings and dates, and the XP from them.</li>
          <li>Your friends, friend requests and groups.</li>
          <li>Anything you import from AniList, MyAnimeList, Letterboxd or IMDb.</li>
        </ul>
      </Section>

      <Section title="What other people can see">
        <p>
          Your profile, Dex, ratings, stats, ranks and activity are public, so friends can find
          you and compare. Your email address is never shown. Friend requests are only visible to
          the two people involved; group members can see each other.
        </p>
      </Section>

      <Section title="Why it's used">
        <p>
          Only to run Shuin: logging you in, saving your Dex, working out XP and ranks, showing
          leaderboards and feeds, and sending account emails such as password resets. There are
          no marketing emails.
        </p>
      </Section>

      <Section title="Who helps run it">
        <ul className="list-disc pl-5">
          <li><b className="text-white">Supabase</b> stores the database, logins and photos.</li>
          <li><b className="text-white">Vercel</b> hosts the website.</li>
          <li><b className="text-white">Resend</b> sends account emails.</li>
        </ul>
        <p>
          When you search, your phone asks AniList, Open Library, Apple Books, Wikidata and (through
          Shuin&apos;s server) TMDB, MangaUpdates and MangaDex for results. Those services see the
          search and, for the ones your phone asks directly, your IP address, as with any
          website.
        </p>
      </Section>

      <Section title="Cookies and local storage">
        <p>
          Shuin keeps you logged in and remembers a few settings (like whether you&apos;ve
          dismissed the install banner) in your browser&apos;s storage. There are no advertising
          or analytics cookies.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can edit or delete anything you&apos;ve logged, and change or remove your profile
          details and photo, at any time. To get a copy of your data or have your account and
          everything in it deleted, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-400 hover:underline">{CONTACT_EMAIL}</a>{" "}
          from the address you signed up with. It&apos;s done within 30 days. Depending on where
          you live (for example the UK or EU), you also have the right to object to how your data
          is used and to complain to your data protection authority.
        </p>
      </Section>

      <Section title="Age">
        <p>Shuin is for people aged 13 and over.</p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes in a way that matters, the date at the top will change and
          you&apos;ll be told in the app.
        </p>
      </Section>
    </InfoPage>
  );
}
