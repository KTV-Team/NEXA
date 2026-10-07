import { useState } from 'react';
import type { z } from '@nexa/validation';

export function useAuthForm<T extends Record<string, string>>(schema: z.ZodType<T>, initial: T) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const result = schema.safeParse(values);
  const errors: Partial<Record<keyof T, string>> = {};
  if (!result.success)
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof T;
      if ((submitted || touched[field]) && !errors[field]) errors[field] = issue.message;
    }
  return {
    values,
    errors,
    setValue: (field: keyof T, value: string) =>
      setValues((current) => ({ ...current, [field]: value })),
    blur: (field: keyof T) => setTouched((current) => ({ ...current, [field]: true })),
    validate: () => {
      setSubmitted(true);
      return result.success ? result.data : null;
    },
    firstInvalid: result.success ? null : (result.error.issues[0]?.path[0] as keyof T),
  };
}
