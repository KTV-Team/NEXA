import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import type { FeedbackVariant } from './inline-alert';
import { styles } from './toast-provider.styles';

export interface ToastAction {
  label: string;
  onPress(): void;
}

export interface ToastOptions {
  variant?: FeedbackVariant;
  action?: ToastAction;
  durationMs?: number;
}

interface ToastValue {
  showToast(message: string, options?: ToastOptions): void;
  dismissToast(): void;
}

interface ActiveToast extends Required<Pick<ToastOptions, 'variant'>> {
  id: number;
  message: string;
  action?: ToastAction;
}

const ToastContext = createContext<ToastValue | null>(null);

const variantConfig = {
  info: { icon: 'info', color: colors['brand-blue'], background: colors['info-surface'] },
  success: { icon: 'check', color: colors['success-accent'], background: colors['success-surface'] },
  warning: { icon: 'alert', color: colors['brand-yellow-deep'], background: colors['surface-yellow'] },
  danger: { icon: 'alert', color: colors.danger, background: colors['danger-surface'] },
} as const;

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const variant = options.variant ?? 'info';
    const id = Date.now();
    setToast({ id, message, variant, action: options.action });
    timeoutRef.current = setTimeout(
      () => setToast((current) => current?.id === id ? null : current),
      options.durationMs ?? (options.action ? 4000 : 3500),
    );
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const config = toast ? variantConfig[toast.variant] : null;

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      <View style={styles.root}>
        {children}
        {toast && config && (
          <View
            pointerEvents="box-none"
            style={[styles.host, { bottom: insets.bottom + 72 }]}
          >
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.toast, { backgroundColor: config.background, borderColor: config.color }]}
            >
              <Icon name={config.icon} size={18} color={config.color} />
              <AppText variant="body-sm" style={styles.message}>{toast.message}</AppText>
              {toast.action && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    try {
                      toast.action?.onPress();
                    } finally {
                      dismissToast();
                    }
                  }}
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                >
                  <AppText variant="caption-bold" style={{ color: config.color }}>
                    {toast.action.label}
                  </AppText>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng thông báo"
                onPress={dismissToast}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <Icon name="close" size={15} color={config.color} />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}
