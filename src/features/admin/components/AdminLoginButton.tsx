"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAdminStore } from "../store";

export function AdminLoginButton() {
  const { isAuthenticated, openModal } = useAdminStore();

  if (isAuthenticated) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={openModal}
    >
      <Plus className="w-4 h-4" />
      Admin Login
    </Button>
  );
}
