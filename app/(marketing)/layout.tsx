/**
 * Marketing/public layout.
 * No sidebar, no header. Clean slate for landing, login, signup pages.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
