import PublicBookingPage from "@/components/booking/PublicBookingPage";

export default async function UserBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { username } = await params;
  const { embed } = await searchParams;
  return <PublicBookingPage username={username} embed={embed === "1"} />;
}
