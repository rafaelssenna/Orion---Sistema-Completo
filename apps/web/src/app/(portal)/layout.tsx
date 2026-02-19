'use client';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-orion-bg text-orion-text">
      {children}
    </div>
  );
}
