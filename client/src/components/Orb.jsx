/* ---------------------------------------------------------------------------
   Orb — the app's calm focal point.

   The original used a WebGL shader (ogl) with an AI-purple palette. That was
   heavy, GPU-dependent, and broke on some machines. This version is pure CSS:
   a soft gradient sphere that gently "breathes". It:
     - needs zero 3D dependencies
     - is far easier to reason about
     - pauses automatically for prefers-reduced-motion users

   `tone` shifts the hue to match the stress level so the orb reflects state.
--------------------------------------------------------------------------- */

import './Orb.css';

export default function Orb({ tone = 'calm', size = 160 }) {
  return (
    <div
      className={`orb orb-${tone}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="A softly glowing orb"
    />
  );
}