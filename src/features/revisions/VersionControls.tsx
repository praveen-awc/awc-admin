import { RevisionPanel } from "./RevisionPanel";
import type { RevisionEntity } from "./revisions.api";
import type { useVersionGuard } from "./useVersionGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * The two pieces of version UI every editor needs: the conflict prompt and the
 * history slide-over.
 *
 * Kept together because they are always mounted together and the wiring is
 * identical in all four editors -- the only differences are the entity type
 * and what "reload" means for that page.
 */
export const VersionControls = ({
  type,
  id,
  version,
  saving,
  onForce,
  historyOpen,
  onCloseHistory,
  onRestored,
}: {
  type: RevisionEntity;
  /** Undefined while creating; there is no history for a record that has none. */
  id?: string;
  version: ReturnType<typeof useVersionGuard>;
  saving: boolean;
  /** Retry the save without a version expectation. */
  onForce: () => void;
  historyOpen: boolean;
  onCloseHistory: () => void;
  onRestored: () => void;
}) => (
  <>
    {/*
      Cancelling leaves the form exactly as it is, so nothing typed is lost
      either way -- the choice is only about whose version ends up stored.
    */}
    <ConfirmDialog
      open={version.conflict}
      title="Someone else saved this while you were editing"
      description={
        "Your changes were not saved. Reload the page to see their version, " +
        "or overwrite it with yours — your text is still in the form."
      }
      confirmLabel="Overwrite with mine"
      loading={saving}
      onCancel={version.dismiss}
      onConfirm={() => {
        version.forceNext();
        onForce();
      }}
    />

    {id && historyOpen && (
      <RevisionPanel
        type={type}
        id={id}
        onClose={onCloseHistory}
        onRestored={onRestored}
      />
    )}
  </>
);
