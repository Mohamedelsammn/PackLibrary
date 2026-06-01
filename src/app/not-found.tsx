import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PackageX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
          <PackageX className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-headline-lg text-foreground">Page not found</h1>
          <p className="text-body-md text-muted-foreground">
            The pack or brand you're looking for doesn't exist or has been
            removed.
          </p>
        </div>
        <Link href="/" className={buttonVariants()}>
          Return to Library
        </Link>
      </div>
    </div>
  );
}
