import type { Profile } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";
import { BANNERS, type Banner } from "@/lib/profile";

type HeaderProfile = Pick<
  Profile,
  "username" | "display_name" | "bio" | "avatar_url" | "banner"
>;

// Banner, avatar, names and bio at the top of a profile.
export default function ProfileHeader({
  profile,
  children,
}: {
  profile: HeaderProfile;
  children?: React.ReactNode; // buttons under the bio
}) {
  const banner = BANNERS[(profile.banner as Banner) ?? ""]?.className ?? BANNERS.midnight.className;
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className={`h-28 ${banner}`} />
      <div className="-mt-12 flex flex-col items-center gap-2 px-5 pb-6 text-center">
        <div className="rounded-full ring-4 ring-[#0b0b10]">
          <Avatar
            username={profile.username}
            url={profile.avatar_url}
            size="lg"
          />
        </div>
        <h1 className="max-w-full break-words text-3xl font-black">
          {profile.display_name || `@${profile.username}`}
        </h1>
        {profile.display_name && <p className="-mt-1 text-sm text-white/50">@{profile.username}</p>}
        {profile.bio && (
          <p className="max-w-md whitespace-pre-line break-words text-sm text-white/75">
            {profile.bio}
          </p>
        )}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </section>
  );
}
