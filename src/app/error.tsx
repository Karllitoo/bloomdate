"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="guest-shell">
      <div className="paper guest-paper">
        <h1>A little hiccup.</h1>
        <p className="muted">
          Please try again. Your invitation deserves another moment.
        </p>
        <button className="btn" style={{ marginTop: 25 }} onClick={reset}>
          Try again
        </button>
      </div>
    </section>
  );
}
