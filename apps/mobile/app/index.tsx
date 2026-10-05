import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  colors,
  mobileTypography,
  rounded,
  spacing,
} from '@nexa/design-tokens';
import { createApiClient } from '@nexa/api-client';
import type { DevDemoData, HealthStatus } from '@nexa/types';

const apiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
});

export default function HomeScreen() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState<DevDemoData | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.health.check();
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const checkDemo = async () => {
    setDemoLoading(true);
    setDemoError(null);
    try {
      setDemo(await apiClient.dev.demo());
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDemoLoading(false);
    }
  };

  useEffect(() => {
    void checkHealth();
    if (__DEV__) void checkDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOk = health?.status === 'ok';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Monorepo starter</Text>
      </View>

      <Text style={styles.title}>NEXA</Text>
      <Text style={styles.subtitle}>Expo + React Native + Turborepo</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>API Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: isOk ? colors['success-accent'] : colors['brand-red'] }]}>
            <Text style={[styles.badgeText, { color: isOk ? colors['on-primary'] : colors['coral-dark'] }]}>
              {isOk ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}

        {!loading && health && (
          <View style={styles.statusContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>
              <Text
                style={[
                  styles.value,
                  {
                    color: isOk ? colors['success-accent'] : colors['coral-dark'],
                    fontWeight: '600',
                  },
                ]}
              >
                {health.status}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.value}>{health.version}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Checked</Text>
              <Text style={styles.value}>
                {new Date(health.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}

        {!loading && error && (
          <Text style={styles.errorText}>
            API not reachable{'\n'}
            <Text style={styles.errorHint}>Run `pnpm dev` to start the API server</Text>
          </Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => void checkHealth()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>
      </View>

      {__DEV__ && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Database demo</Text>
          {demoLoading && <ActivityIndicator color={colors.primary} />}
          {!demoLoading && demoError && (
            <Text style={styles.errorText}>Database unavailable: {demoError}</Text>
          )}
          {!demoLoading && demo && (
            <View style={styles.statusContainer}>
              <Text style={styles.value}>PostgreSQL: {demo.database}</Text>
              {demo.users.length === 0 && <Text style={styles.label}>No demo data yet</Text>}
              {demo.users.map((user) => (
                <Text key={user.id} style={styles.value}>{user.name} / {user.systemRole}</Text>
              ))}
              {demo.teams.map((team) => (
                <Text key={team.id} style={styles.value}>
                  {team.name} / {team.members.length} members
                </Text>
              ))}
              <Text style={styles.label}>
                {demo.counts.todoItems} todos / {demo.counts.events} events / {demo.counts.notifications} notifications
              </Text>
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => void checkDemo()}
            disabled={demoLoading}
          >
            <Text style={styles.buttonText}>Refresh database demo</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.footnote}>GET http://localhost:4000/api/v1/health</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // White canvas floor per DESIGN.md — Miro-style clean workspace.
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.canvas,
    gap: spacing.md,
  },
  // {component.badge-tag-yellow} — yellow-tinted pill badge.
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors['surface-yellow'],
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  badgeText: {
    ...mobileTypography('micro-uppercase'),
    color: colors['yellow-dark'],
  },
  title: {
    ...mobileTypography('heading-2'),
    color: colors.ink,
  },
  subtitle: {
    ...mobileTypography('subtitle'),
    color: colors.slate,
  },
  // {component.card-base} — canvas fill, hairline-soft border, rounded.xl.
  card: {
    marginTop: spacing.sm,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
    borderRadius: rounded.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    ...mobileTypography('heading-5'),
    color: colors.ink,
  },
  loader: {
    marginVertical: spacing.md,
  },
  statusContainer: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    ...mobileTypography('body-sm'),
    color: colors.muted,
  },
  value: {
    ...mobileTypography('body-sm'),
    color: colors.ink,
  },
  errorText: {
    ...mobileTypography('body-sm'),
    color: colors.stone,
  },
  errorHint: {
    ...mobileTypography('caption'),
    color: colors.muted,
  },
  // {component.button-primary} — black pill, 44px tall, {rounded.full} per DESIGN.md.
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  // {component.button-primary-pressed} — lifts to charcoal.
  buttonPressed: {
    backgroundColor: colors.charcoal,
  },
  buttonText: {
    ...mobileTypography('button-md'),
    color: colors['on-primary'],
  },
  footnote: {
    ...mobileTypography('caption'),
    color: colors.stone,
  },
});
