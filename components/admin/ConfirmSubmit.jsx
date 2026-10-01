"use client";

/**
 * A form submit button that asks for confirmation first (client-side dialog).
 * props: action (server action fn), message, label, hidden [{name,value}], className, formClass
 * Used for permanent delete from the trash view.
 */
export default function ConfirmSubmit({ action, message, label, hidden = [], className = "", formClass = "inline", title = "" }) {
  return (
    <form
      action={action}
      className={formClass}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {hidden.map((h) => (
        <input key={h.name} type="hidden" name={h.name} value={h.value} />
      ))}
      <button type="submit" className={className} title={title} aria-label={title}>
        {label}
      </button>
    </form>
  );
}
