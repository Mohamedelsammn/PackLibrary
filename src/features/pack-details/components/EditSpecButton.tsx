"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminStore } from "@/features/admin/store";
import { useRouter } from "next/navigation";

interface EditSpecButtonProps {
  packId: string;
}

export function EditSpecButton({ packId }: EditSpecButtonProps) {
  const { isAuthenticated, openModal, setOnAuthSuccess } = useAdminStore();
  const router = useRouter();

  function handleClick() {
    if (isAuthenticated) {
      router.push(`/admin/edit/${packId}`);
    } else {
      setOnAuthSuccess(() => () => router.push(`/admin/edit/${packId}`));
      openModal();
    }
  }

  return (
    <Button size="sm" className="gap-2" onClick={handleClick}>
      <Pencil className="w-4 h-4" />
      Edit Spec
    </Button>
  );
}
