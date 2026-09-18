import Link from "next/link";
import { Island } from "@/components/Island";

const steps = [
  {
    title: "Share a link",
    body: "Create a pod and send the link to your friends. They pick an animal and a name. Nobody needs an account.",
  },
  {
    title: "Sit down together",
    body: "Start the timer when everyone is ready. You all see the same countdown, then you put your phones down and work.",
  },
  {
    title: "Watch the island grow",
    body: "Every focused minute adds to your pod's island. If someone wanders off, building slows down until they're back.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="relative inline-block text-2xl font-semibold tracking-tight">
          Focuspal
          <svg
            aria-hidden="true"
            viewBox="0 0 120 12"
            preserveAspectRatio="none"
            className="absolute -bottom-1.5 left-0 h-2.5 w-full"
          >
            <path
              d="M3 8 C 30 3, 52 9, 78 5 S 108 4, 117 6"
              fill="none"
              stroke="var(--mint)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </svg>
        </Link>
        <Link href="/join" className="text-base font-medium underline-offset-4 hover:underline">
          Join a pod
        </Link>
      </header>

      <section className="grid items-center gap-6 pb-10 pt-2 lg:grid-cols-2 lg:gap-4 lg:pb-16 lg:pt-8">
        <div className="text-center lg:text-left">
          <h1 className="whitespace-nowrap text-[clamp(1.9rem,9.5vw,2.6rem)] font-medium leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-[3.4rem] xl:text-[4rem]">
            A little company.
            <br />
            A lot more focus.
          </h1>
          <p className="mx-auto mt-6 max-w-[34rem] text-lg leading-relaxed text-muted lg:mx-0">
            Start a focus timer with your friends. While everyone works, your pod builds a tiny
            island together, one hand-drawn piece at a time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/new"
              className="rounded-xl bg-mint px-8 py-3.5 text-center text-lg font-medium text-text transition-colors hover:bg-mint-deep"
            >
              Create a pod
            </Link>
            <Link
              href="/join"
              className="rounded-xl border-[1.5px] border-ink px-8 py-3.5 text-center text-lg font-medium transition-colors hover:bg-mint-wash"
            >
              Join a pod
            </Link>
          </div>
        </div>

        <div className="order-first lg:order-none lg:-mr-10">
          <Island />
        </div>
      </section>

      <ol className="grid gap-8 border-t-[1.5px] border-ink py-10 sm:grid-cols-3 sm:gap-10">
        {steps.map((step, i) => (
          <li key={step.title}>
            <p className="text-sm font-semibold text-mint-deep">{i + 1}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{step.title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
