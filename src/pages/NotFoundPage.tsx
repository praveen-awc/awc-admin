import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const NotFoundPage = () => (
  <EmptyState
    icon={FileQuestion}
    title="Page not found"
    description="That page doesn't exist in the admin panel."
    action={
      <Link to="/blogs">
        <Button size="sm" variant="secondary">
          Back to Blog
        </Button>
      </Link>
    }
  />
);
