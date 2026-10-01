/** Inline SVG action icons for admin list rows (RTL: use `mr`/`ml` spacing as needed). */

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function EditIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function ViewIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TrashIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
    </svg>
  );
}

export function RestoreIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    </svg>
  );
}

export function WarnIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01" />
    </svg>
  );
}

export function StarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1Z" />
    </svg>
  );
}

/** Standard icon-button classes */
export const iconBtn =
  "p-2 rounded-lg transition inline-flex items-center justify-center";
export const iconBtnEdit = `${iconBtn} text-[#c0562f] hover:bg-amber-100`;
export const iconBtnView = `${iconBtn} text-gray-400 hover:text-[#c0562f] hover:bg-amber-100`;
export const iconBtnTrash = `${iconBtn} text-red-500 hover:bg-red-50`;
export const iconBtnRestore = `${iconBtn} text-green-600 hover:bg-green-50`;
export const iconBtnWarn = `${iconBtn} text-red-600 hover:bg-red-100`;
