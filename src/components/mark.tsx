import Link from "next/link";

export function Mark({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "cream" }) {
  return (
    <Link href={href} className="brand" data-tone={tone}>
      <span className="brand-mark" aria-hidden="true">
        Cf
      </span>
      <span>ClientFlow</span>
    </Link>
  );
}
