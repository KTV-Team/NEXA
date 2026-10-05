'use client';

import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@nexa/api-client';
import type { DevDemoData } from '@nexa/types';

const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
});

export function DemoPanel() {
  const [data, setData] = useState<DevDemoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiClient.dev.demo());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'API request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section aria-live="polite" style={{ marginTop: 24, padding: 24, border: '1px solid #ddd', borderRadius: 16 }}>
      <h2>PostgreSQL</h2>
      {loading && <p>Loading…</p>}
      {error && <p role="alert">Database demo unavailable: {error}</p>}
      {data && (
        <>
          <p>Connection: {data.database}</p>
          {data.users.length === 0 && <p>No demo data yet. Seed the local database.</p>}
          <h3>Users</h3>
          <ul>{data.users.map((user) => <li key={user.id}>{user.name} ({user.systemRole}) — {user.id}</li>)}</ul>
          <h3>Teams</h3>
          <ul>
            {data.teams.map((team) => (
              <li key={team.id}>
                {team.name} — {team.id}: {team.members.map((member) => `${member.role} ${member.userId}`).join(', ')}
              </li>
            ))}
          </ul>
          <p>{data.counts.todoItems} todos · {data.counts.events} events · {data.counts.notifications} notifications</p>
        </>
      )}
      <button type="button" onClick={() => void refresh()} disabled={loading}>
        Refresh from API
      </button>
    </section>
  );
}
