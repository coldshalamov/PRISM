/* Magic UI-style border beam, reimplemented natively (the page's CSP rules out CDN scripts and the app has no Tailwind).
   A light travels once around the frame of its parent while a job is running, so the motion answers an action and
   stops when the answer arrives. The parent must be position: relative. Reduced motion gets a still arc. */
export function BorderBeam({ active }: { active: boolean }) {
  return <span className={`border-beam${active ? ' on' : ''}`} aria-hidden="true" />;
}
