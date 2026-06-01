import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { AdminPasswordModal } from "@/features/admin/components/AdminPasswordModal";

interface AppShellProps {
  children: ReactNode;
  activeBrandSlug?: string;
}

export function AppShell({ children, activeBrandSlug }: AppShellProps) {
  return (
    <div className="flex h-full min-h-screen">
      <Sidebar activeBrandSlug={activeBrandSlug} />
      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        {children}
      </main>
      {/* Global modal — available on every page inside AppShell */}
      <AdminPasswordModal />
    </div>
  );
}
