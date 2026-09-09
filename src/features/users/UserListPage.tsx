import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Shield, Trash2, X } from "lucide-react";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
  type AdminUserRow,
} from "./user.api";
import type { AdminRole } from "@/auth/auth.api";
import { useAuth } from "@/auth/useAuth";
import { errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { PageHeader, SearchBox } from "@/components/ui/ListToolbar";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

export const UserListPage = () => {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<AdminUserRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminUserRow | null>(null);

  const params = { page, limit: 20, q };
  const query = useQuery({
    queryKey: ["users", params],
    queryFn: () => listUsers(params),
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["users"] });

  const mutate = useMutation({
    mutationFn: ({
      id,
      changes,
    }: {
      id: string;
      changes: Parameters<typeof updateUser>[1];
    }) => updateUser(id, changes),
    onSuccess: () => {
      toast.success("User updated");
      setResetting(null);
      invalidate();
    },
    // The API refuses self-demotion and self-deactivation; show its reason.
    onError: (error) => toast.error(errorMessage(error, "Could not update")),
  });

  const creation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("User created");
      setCreating(false);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not create user")),
  });

  const removal = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("User deleted");
      setPendingDelete(null);
      invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete")),
  });

  const users = query.data?.users ?? [];
  const meta = query.data?.meta;

  const columns: Column<AdminUserRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <>
          <span className="font-medium text-slate-900">{row.name}</span>
          {row._id === currentUser?.id && (
            <span className="ml-1.5 text-xs text-slate-400">(you)</span>
          )}
          <p className="mt-0.5 text-xs text-slate-400">{row.email}</p>
        </>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => (
        <Select
          className="w-32"
          value={row.role}
          disabled={row._id === currentUser?.id}
          onChange={(event) =>
            mutate.mutate({
              id: row._id,
              changes: { role: event.target.value as AdminRole },
            })
          }
        >
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </Select>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge tone="green">Active</Badge>
        ) : (
          <Badge tone="slate">Disabled</Badge>
        ),
    },
    {
      key: "lastLogin",
      header: "Last sign-in",
      cell: (row) => formatDateTime(row.lastLoginAt),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Reset password"
            onClick={() => setResetting(row)}
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={row._id === currentUser?.id}
            onClick={() =>
              mutate.mutate({
                id: row._id,
                changes: { isActive: !row.isActive },
              })
            }
          >
            {row.isActive ? "Disable" : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Delete"
            className="text-red-600 hover:bg-red-50"
            disabled={row._id === currentUser?.id}
            onClick={() => setPendingDelete(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            New user
          </Button>
        }
      />

      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <strong>Editors</strong> can create and edit content but cannot delete it
        or manage accounts. <strong>Admins</strong> can do everything. Changing a
        role or disabling an account signs that person out immediately.
      </p>

      <SearchBox
        value={q}
        placeholder="Search name or email"
        onChange={(value) => {
          setQ(value);
          setPage(1);
        }}
      />

      {query.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : query.isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage(query.error, "Could not load users")}
        </p>
      ) : users.length === 0 ? (
        <EmptyState icon={Shield} title="No users found" />
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(row) => row._id}
          footer={
            meta && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onChange={setPage}
              />
            )
          }
        />
      )}

      {creating && (
        <NewUserDialog
          saving={creation.isPending}
          onCancel={() => setCreating(false)}
          onSubmit={(input) => creation.mutate(input)}
        />
      )}

      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          saving={mutate.isPending}
          onCancel={() => setResetting(null)}
          onSubmit={(password) =>
            mutate.mutate({ id: resetting._id, changes: { password } })
          }
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name}?`}
        description="They lose access immediately. Content they created is not affected."
        confirmLabel="Delete"
        loading={removal.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removal.mutate(pendingDelete._id)}
      />
    </div>
  );
};

const Dialog = ({
  title,
  children,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  onCancel: () => void;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    onClick={onCancel}
  >
    <div
      className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-4 flex items-center">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="ml-auto text-slate-400 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const NewUserDialog = ({
  saving,
  onCancel,
  onSubmit,
}: {
  saving: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
  }) => void;
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("editor");

  const valid = name.trim() && email.trim() && password.length >= 12;

  return (
    <Dialog title="New user" onCancel={onCancel}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field
          label="Password"
          required
          hint="At least 12 characters. Share it with them securely; they can change it after signing in."
        >
          <Input
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Role">
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value as AdminRole)}
          >
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            disabled={!valid}
            onClick={() => onSubmit({ name, email, password, role })}
          >
            Create user
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

const ResetPasswordDialog = ({
  user,
  saving,
  onCancel,
  onSubmit,
}: {
  user: AdminUserRow;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (password: string) => void;
}) => {
  const [password, setPassword] = useState("");

  return (
    <Dialog title={`Reset password for ${user.name}`} onCancel={onCancel}>
      <div className="space-y-3">
        <Field
          label="New password"
          required
          hint="At least 12 characters. This signs them out of every device."
        >
          <Input
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            disabled={password.length < 12}
            onClick={() => onSubmit(password)}
          >
            Reset password
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
