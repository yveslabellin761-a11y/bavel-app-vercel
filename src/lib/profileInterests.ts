export function normalizeProfileInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((interest: unknown) => {
      if (typeof interest === 'string') return interest.trim();
      if (!interest || typeof interest !== 'object' || Array.isArray(interest)) return '';
      const label = 'label' in interest ? interest.label : undefined;
      return typeof label === 'string' ? label.trim() : '';
    })
    .filter(Boolean)
    .slice(0, 8);
}
