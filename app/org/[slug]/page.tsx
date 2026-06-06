import OrgBookingPage from "@/components/org/OrgBookingPage";

export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrgBookingPage slug={slug} />;
}
