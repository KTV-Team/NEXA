import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@nexa/design-tokens';
import { createApiClient } from '@nexa/api-client';
import type { HealthStatus } from '@nexa/types';

const apiClient = createApiClient({
  baseUrl: process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1',
});

export default function HomeScreen() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    void checkHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>NEXA Mobile</Text>
      <Text style={styles.subtitle}>Expo + React Native + Turborepo</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>API Status</Text>

        {loading && <ActivityIndicator color={colors.primary[500]} style={styles.loader} />}

        {!loading && health && (
          <View style={styles.statusContainer}>
            <View style={styles.row}>
              <Text style={styles.label}>Status: </Text>
              <Text
                style={[
                  styles.value,
                  { color: health.status === 'ok' ? colors.success.main : colors.error.main },
                ]}
              >
                {health.status === 'ok' ? '✓ OK' : '✗ Error'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Version: </Text>
              <Text style={styles.value}>{health.version}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Checked: </Text>
              <Text style={styles.value}>
                {new Date(health.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        )}

        {!loading && error && (
          <Text style={styles.errorText}>
            ⚠ Could not reach API{'\n'}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    backgroundColor: colors.gray[50],
    gap: spacing[4],
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.primary[600],
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: spacing[3],
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing[1],
  },
  loader: {
    marginVertical: spacing[4],
  },
  statusContainer: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    fontWeight: '500',
  },
  errorText: {
    color: colors.warning.dark,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  errorHint: {
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  buttonPressed: {
    backgroundColor: colors.primary[600],
    opacity: 0.9,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
});
