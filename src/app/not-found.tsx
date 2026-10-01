import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="eyebrow">Missing</p>
      <h1 className="font-serif text-4xl">That record is not in this workspace.</h1>
      <Link href="/dashboard" className="btn btn-primary mt-6 w-fit">
        Back to overview
      </Link>
    </div>
  );
}
