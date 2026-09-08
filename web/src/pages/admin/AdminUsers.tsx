import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth";
import { Badge, Card, CardBody, CardHeader, ErrorNote, Input, Select, Spinner } from "../../components/ui";
import type { Role, User } from "../../types";

const ROLES: Role[] = ["participant", "judge", "volunteer", "admin"];
const roleColors: Record<Role, "gray" | "maroon" | "sand" | "red"> = {
  participant: "gray",
  judge: "maroon",
  volunteer: "sand",
  admin: "red",
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => api<User[]>("/admin/users").then(setUsers);
  useEffect(() => { load(); }, []);

  if (users === null) return <Spinner />;

  const setRole = async (userId: string, role: Role) => {
    setError(null);
    try {
      await api(`/admin/users/${userId}/role`, { method: "POST", body: { role } });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role change failed");
    }
  };

  const query = filter.trim().toLowerCase();
  const visible = users.filter(
    (u) => !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-maroon-700">Users & roles</h1>
      <ErrorNote message={error} />
      <Card>
        <CardHeader
          title={`${users.length} accounts`}
          subtitle="Grant judge, volunteer, or admin access. Volunteers can run check-in stations; judges get routes and scoring."
          actions={<Input className="w-56" placeholder="Search name or email…" value={filter} onChange={(e) => setFilter(e.target.value)} />}
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-maroon-100 text-left text-xs uppercase tracking-wider text-ink/50">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-2 py-3">Email</th>
                  <th className="px-2 py-3">Role</th>
                  <th className="px-5 py-3">Change role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-maroon-100">
                {visible.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-2 font-semibold">{u.name}</td>
                    <td className="px-2 py-2 text-ink/70">{u.email}</td>
                    <td className="px-2 py-2"><Badge color={roleColors[u.role]}>{u.role}</Badge></td>
                    <td className="px-5 py-2">
                      {u.id === me?.id ? (
                        <span className="text-xs text-ink/40">that's you</span>
                      ) : (
                        <Select
                          className="w-40"
                          value={u.role}
                          onChange={(e) => setRole(u.id, e.target.value as Role)}
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
