/**
 * Breadcrumbs — Navigation breadcrumb trail
 * UX-MS0-U04: Breadcrumb navigation
 */

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (href: string) => void;
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" style={{
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 13, color: "#6b7280", marginBottom: 16,
    }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <span style={{ color: "#d1d5db" }}>/</span>}
          {item.href && i < items.length - 1 ? (
            <a
              href={item.href}
              onClick={e => {
                if (onNavigate) { e.preventDefault(); onNavigate(item.href!); }
              }}
              style={{
                color: "#3b82f6", textDecoration: "none",
                cursor: "pointer",
              }}
            >
              {item.label}
            </a>
          ) : (
            <span style={{
              color: i === items.length - 1 ? "#111827" : "#6b7280",
              fontWeight: i === items.length - 1 ? 600 : 400,
            }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
