const PROFILE_DETAIL_KEYS = new Set([
  'height',
  'children',
  'alcohol',
  'education',
  'personality',
  'pets',
  'religion',
  'zodiac',
  'languages',
  'relation',
  'sexuality',
  'smoking',
  'prompts',
  'promptQuestion',
  'promptAnswer'
]);

export function normalizeProfileDetails(value: unknown): Record<string, unknown> | string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.slice(0, 240));
  }
  if (!value || typeof value !== 'object') return {};

  const details: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!PROFILE_DETAIL_KEYS.has(key)) continue;

    if (key === 'prompts' && Array.isArray(item)) {
      const prompts = item
        .filter((prompt): prompt is Record<string, unknown> =>
          Boolean(prompt) && typeof prompt === 'object' && !Array.isArray(prompt)
        )
        .map(prompt => ({
          question: typeof prompt.question === 'string' ? prompt.question.slice(0, 240) : '',
          answer: typeof prompt.answer === 'string' ? prompt.answer.slice(0, 500) : ''
        }))
        .filter(prompt => prompt.question && prompt.answer);
      if (prompts.length) details.prompts = prompts;
    } else if (typeof item === 'string') {
      details[key] = item.slice(0, 500);
    }
  }
  return details;
}
