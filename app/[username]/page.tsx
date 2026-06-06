import PublicBookingPage from "@/components/booking/PublicBookingPage";

export default async function UserBookingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <PublicBookingPage username={username} />;
}
