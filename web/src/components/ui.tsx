import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "sand";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-maroon-700 text-white hover:bg-maroon-800 disabled:bg-maroon-300",
    outline: "border border-maroon-700 text-maroon-700 hover:bg-maroon-50 disabled:opacity-50",
    ghost: "text-maroon-700 hover:bg-maroon-50 disabled:opacity-50",
    danger: "bg-falcon text-white hover:bg-maroon-800 disabled:opacity-50",
    sand: "bg-sand text-ink hover:brightness-95 disabled:opacity-50",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-maroon-100 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-maroon-100 px-5 py-4">
      <div>
        <h2 className="font-display text-lg font-bold text-maroon-700">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink/70">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold text-ink">
      {children}
    </label>
  );
}

const fieldStyles =
  "w-full rounded-md border border-maroon-200 bg-white px-3 py-2 text-sm outline-none focus:border-maroon-700 focus:ring-2 focus:ring-maroon-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldStyles, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldStyles, className)} {...props}>
      {children}
    </select>
  );
}

export function Badge({
  color = "maroon",
  children,
}: {
  color?: "maroon" | "sand" | "green" | "gray" | "red";
  children: ReactNode;
}) {
  const styles = {
    maroon: "bg-maroon-100 text-maroon-800",
    sand: "bg-sand/40 text-ink",
    green: "bg-emerald-100 text-emerald-800",
    gray: "bg-gray-100 text-gray-700",
    red: "bg-falcon/10 text-falcon",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[color])}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-maroon-200 border-t-maroon-700" />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-maroon-200 px-6 py-10 text-center">
      <p className="font-semibold text-maroon-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink/60">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-md border border-falcon/30 bg-falcon/5 px-3 py-2 text-sm text-falcon">
      {message}
    </div>
  );
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
