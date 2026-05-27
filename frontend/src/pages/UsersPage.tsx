import { useState } from "react";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "../lib/queries";
import { useAuthStore } from "../stores/authStore";
import type { User, UserCreate, UserUpdate } from "../types";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  manager: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  warehouse_staff: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  viewer: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  warehouse_staff: "Warehouse",
  viewer: "Viewer",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        ROLE_STYLES[role] ?? "bg-slate-500/20 text-slate-300"
      }`}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface UserModalProps {
  mode: "create" | "edit";
  user?: User;
  onClose: () => void;
}

const ROLES = ["admin", "manager", "warehouse_staff", "viewer"] as const;

function UserModal({ mode, user, onClose }: UserModalProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "viewer",
    is_active: user?.is_active ?? true,
  });
  const [error, setError] = useState("");

  const isLoading = createUser.isPending || updateUser.isPending;

  const handleSubmit = async () => {
    setError("");
    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Full name and email are required.");
      return;
    }
    if (mode === "create" && !form.password.trim()) {
      setError("Password is required.");
      return;
    }
    try {
      if (mode === "create") {
        const payload: UserCreate = {
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: form.role,
        };
        await createUser.mutateAsync(payload);
      } else if (user) {
        const payload: UserUpdate = {
          full_name: form.full_name,
          role: form.role,
          is_active: form.is_active,
        };
        await updateUser.mutateAsync({ userId: user.id, payload });
      }
      onClose();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Something went wrong.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-5">
          {mode === "create" ? "Create User" : "Edit User"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            {mode === "create" ? (
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="jane@company.com"
              />
            ) : (
              <div className="w-full bg-slate-700/50 border border-white/10 rounded-lg px-3 py-2 text-slate-400 text-sm">
                {user?.email}
              </div>
            )}
          </div>

          {mode === "create" && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Min 8 characters"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as UserCreate["role"] })
              }
              className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>

          {mode === "edit" && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Account Active</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.is_active ? "bg-indigo-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Saving..."
              : mode === "create"
              ? "Create User"
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ user, onClose }: { user: User; onClose: () => void }) {
  const deleteUser = useDeleteUser();
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setError("");
    try {
      await deleteUser.mutateAsync(user.id);
      onClose();
    } catch {
      setError("Failed to delete user. They may still have associated records.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">Delete User</h3>
            <p className="text-slate-400 text-sm">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-white">{user.full_name}</span>{" "}
          ({user.email})?
        </p>
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteUser.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
          >
            {deleteUser.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { data: users, isLoading, error } = useUsers();

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {users?.length ?? 0} user{users?.length !== 1 ? "s" : ""} in the system
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New User
          </button>
        )}
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading users...
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">Failed to load users.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Role</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Created</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Last Login</th>
                {isAdmin && (
                  <th className="px-5 py-3 text-slate-400 font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-xs font-bold flex-shrink-0">
                        {u.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{u.email}</td>
                  <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      u.is_active ? "text-emerald-400" : "text-slate-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.is_active ? "bg-emerald-400" : "bg-slate-500"
                      }`} />
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3.5 text-slate-400">{formatDate(u.last_login)}</td>
                  {isAdmin && (
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="Edit user"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete user"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-5 py-12 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <UserModal mode="create" onClose={() => setShowCreate(false)} />}
      {editingUser && <UserModal mode="edit" user={editingUser} onClose={() => setEditingUser(null)} />}
      {deletingUser && <DeleteConfirm user={deletingUser} onClose={() => setDeletingUser(null)} />}
    </div>
  );
}