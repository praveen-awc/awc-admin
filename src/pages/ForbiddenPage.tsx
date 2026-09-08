import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const ForbiddenPage = () => (
  <EmptyState
    icon={ShieldAlert}
    title="You don't have access to this"
    description="Ask an administrator if you need permission for this area."
  />
);
