/**
 * Helper to generate a deterministic 8-digit ID for profiles
 */
export const getProfileIdNumber = (id: string): string => {
  if (id === 'f1' || id === '1') return '28200157';
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Ensure we are in the 8-digit range, centered around 28200000
  const offset = Math.abs(hash) % 90000; // ranges 0 to 89999
  const baseVal = 28200000 + offset;
  return baseVal.toString();
};
