/**
 * StressPill — renders a stress level consistently everywhere.
 *
 * This is the UI's single interpretation of the vocabulary. Because the
 * backend can only ever send Low/Medium/High (contract.js), this component has
 * no "Moderate" case to forget.
 */
export default function StressPill({ level }) {
  if (!level) return null;
  const tone = level.toLowerCase(); // low | medium | high
  return <span className={`pill pill-${tone}`}>Stress: {level}</span>;
}

export function EmotionPill({ emotion }) {
  if (!emotion) return null;
  return <span className="pill">Feeling: {emotion}</span>;
}