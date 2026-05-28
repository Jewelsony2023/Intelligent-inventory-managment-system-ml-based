import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

// ---- Types ----
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  pages: number;
}

const ROLES = ["admin", "manager", "warehouse_staff", "viewer"];

// ---- Hooks ----
function useUsers(page: number, search: string) {
  return useQuery<UsersResponse>({
    queryKey: ["users", page, search],
    queryFn: async () => {
      const res = await api.get<User[]>("/users/");
      const filtered = search
        ? res.data.filter((user) => {
            const term = search.toLowerCase();
            return (
              user.full_name.toLowerCase().includes(term) ||
              user.email.toLowerCase().includes(term)
            );
          })
        : res.data;
      const size = 20;
      const start = (page - 1) * size;
      return {
        items: filtered.slice(start, start + size),
        total: filtered.length,
        page,
        pages: Math.max(1, Math.ceil(filtered.length / size)),
      };
    },
    placeholderData: keepPreviousData,
  });
}

// ---- User Form Modal ----
function UserModal({
  user,
  onClose,
  onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = user !== null;
  const [form, setForm] = useState({
    email: user?.email ?? "",
    full_name: user?.full_name ?? "",
    role: user?.role ?? "viewer",
    password: "",
    is_active: user?.is_active ?? true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key: string, val: string | boolean) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setError("");
    if (!form.email.trim() || !form.full_name.trim()) {
      setError("Email and full name are required.");
      return;
    }
    if (!isEdit && !form.password) {
      setError("Password is required for new users.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const payload: any = {
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${user!.id}`, payload);
      } else {
        await api.post("/users/", {
          email: form.email,
          full_name: form.full_name,
          role: form.role,
          password: form.password,
          is_active: form.is_active,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ?? "Failed to save user."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold text-white">
          {isEdit ? "Edit User" : "Create User"}
        </h3>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-950/40 border border-rose-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Full Name
            </label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              disabled={isEdit}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              {isEdit ? "New Password (leave blank to keep)" : "Password"}
            </label>
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : ""}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Role</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">
              Active account
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Confirm Delete Modal ----
function ConfirmDeleteModal({
  user,
  onConfirm,
  onCancel,
  loading,
}: {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-semibold text-white">Delete User</h3>
        <p className="text-gray-400 text-sm">
          Are you sure you want to delete{" "}
          <span className="text-white font-medium">{user.full_name}</span>? This
          cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Role Badge ----
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-rose-900/40 text-rose-400 border-rose-800",
    manager: "bg-amber-900/40 text-amber-400 border-amber-800",
    warehouse_staff: "bg-cyan-900/40 text-cyan-400 border-cyan-800",
    viewer: "bg-gray-800 text-gray-400 border-gray-700",
  };
  return (
    <span
      className={`text-xs border rounded-full px-2 py-0.5 ${
        colors[role] ?? colors.viewer
      }`}
    >
      {role.replace("_", " ")}
    </span>
  );
}

// ---- Main Page ----
export default function UsersPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const usersQ = useUsers(page, search);
  const users = usersQ.data?.items ?? [];
  const totalPages = usersQ.data?.pages ?? 1;

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      qc.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    } catch (e) {
      // user can retry
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      {/* Modals */}
      {editUser !== undefined && (
        <UserModal
          user={editUser}
          onClose={() => setEditUser(undefined)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["users"] })}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-400 text-sm mt-1">
            {usersQ.data?.total ?? 0} total users
          </p>
        </div>
        <button
          onClick={() => setEditUser(null)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
        >
          + Add User
        </button>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 w-72"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {usersQ.isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No users found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                      {u.full_name}
                      {isSelf && (
                        <span className="text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800 rounded-full px-1.5 py-0.5">
                          you
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          u.is_active
                            ? "text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800 rounded-full px-2 py-0.5"
                            : "text-xs bg-gray-800 text-gray-500 border border-gray-700 rounded-full px-2 py-0.5"
                        }
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditUser(u)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-950/40"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => !isSelf && setDeleteTarget(u)}
                          disabled={isSelf}
                          className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isSelf ? "Cannot delete your own account" : ""}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
