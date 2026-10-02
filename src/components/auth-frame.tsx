import Link from "next/link";
import { Mark } from "@/components/mark";

export function AuthFrame({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden flex-col justify-between bg-pine px-12 py-10 text-cream md:flex">
        <Mark href="/" tone="cream" />
        <div className="rise">
          <p className="max-w-md font-serif text-5xl leading-[1.05]">The client and the agency share one record of the work.</p>
          <p className="mt-4 max-w-sm text-sm text-[#c9d7d1]">
            Versions, approvals, and invoices stay in the workspace. The thread does not split across chat and a spreadsheet.
          </p>
        </div>
        <p className="text-sm text-[#9fb2aa]">Northline Studio is ready if you want the demo.</p>
      </section>
      <section className="flex items-center px-6 py-12 md:px-12">
        <div className="rise w-full max-w-md">
          <Link href="/" className="mb-8 inline-block text-sm text-muted md:hidden">
            Back to ClientFlow
          </Link>
          <h1 className="font-serif text-4xl">{title}</h1>
          <p className="mt-2 mb-6 text-muted">{lede}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
