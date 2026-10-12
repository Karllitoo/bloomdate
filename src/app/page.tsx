"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Heart,
  Mail,
  CalendarDays,
  Check,
  ArrowRight,
} from "lucide-react";
import { Botanical, Sprig } from "@/components/botanical";
import { useLanguage } from "@/components/chrome";
export default function Home() {
  const { lang } = useLanguage();
  const en = lang === "en";
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />{" "}
            {en ? "FOR YOUR FAVOURITE PERSON" : "UNTUK INSAN TERSAYANG"}
          </div>
          <h1>
            {en ? (
              <>
                A little invitation.
                <br />A <em>beautiful</em> date.
              </>
            ) : (
              <>
                Jemputan kecil.
                <br />
                Janji temu <em>indah.</em>
              </>
            )}
          </h1>
          <p className="hero-description">
            {en
              ? "Some moments deserve more than a “you free?” text. Send something thoughtful, let them choose, and make a little memory together."
              : "Sesetengah detik layak mendapat lebih daripada mesej biasa. Hantar jemputan istimewa, beri mereka pilihan, dan cipta kenangan bersama."}
          </p>
          <div className="hero-actions">
            <Link href="/create" className="btn">
              {en ? "Create an invitation" : "Cipta jemputan"}
              <ArrowUpRight size={18} />
            </Link>
            <Link href="/demo" className="text-link">
              {en ? "Peek at the experience" : "Lihat pengalaman"}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-footnote">
            <Heart size={14} />
            {en
              ? "Personal, private, and a little bit magical."
              : "Peribadi, istimewa, dan sedikit magis."}
          </div>
        </div>
        <div className="hero-art">
          <div className="art-orbit" />
          <Botanical className="hero-flower flower-left" />
          <Botanical className="hero-flower flower-right" />
          <span className="handwritten art-note">
            a little courage,
            <br />a lot of heart <span>↘</span>
          </span>
          <Link href="/demo" className="preview-card">
            <span className="preview-label">A LITTLE INVITATION FOR YOU</span>
            <Sprig />
            <h2>
              Alya,
              <br />
              shall we make
              <br />
              <em>a little memory?</em>
            </h2>
            <p>A coffee. A sunset. A little time, just us.</p>
            <div className="wax-seal">
              <Heart size={23} strokeWidth={1.4} />
            </div>
            <span className="preview-from">With love, Adam</span>
            <span className="preview-open">
              Open your invitation <ArrowUpRight size={13} />
            </span>
          </Link>
          <span className="sample-stamp">
            {en ? "Sample invitation" : "Contoh jemputan"}
          </span>
          <div className="art-pill">
            <span className="tiny-heart">♡</span>{" "}
            {en ? "A yes worth waiting for." : "Menanti jawapan istimewa."}
          </div>
        </div>
      </section>
      <div className="value-strip">
        <span>
          <Mail size={17} />
          {en ? "A link, made personal" : "Pautan peribadi"}
        </span>
        <span>
          <CalendarDays size={17} />
          {en ? "A date you choose together" : "Pilih tarikh bersama"}
        </span>
        <span>
          <Heart size={17} />
          {en ? "No app. Just a little love." : "Tanpa aplikasi. Penuh cinta."}
        </span>
      </div>
      <section className="how-section" id="how">
        <div className="section-heading">
          <div>
            <div className="eyebrow">A THOUGHTFUL LITTLE GESTURE</div>
            <h2>
              {en ? (
                <>
                  From a little spark
                  <br />
                  to <em>“it’s a date.”</em>
                </>
              ) : (
                <>
                  Dari percikan kecil
                  <br />
                  ke <em>janji temu indah.</em>
                </>
              )}
            </h2>
          </div>
          <p>
            {en
              ? "You bring the feeling. We make it easy to turn it into a plan."
              : "Anda bawa perasaan. Kami bantu jadikannya sebuah rancangan."}
          </p>
        </div>
        <div className="steps-grid">
          {(en
            ? [
                [
                  "01",
                  "Make it personal.",
                  "Their name. Your words. A little note that feels like you.",
                ],
                [
                  "02",
                  "Send a little surprise.",
                  "Share a private link. They open an envelope made just for them.",
                ],
                [
                  "03",
                  "Let the moment bloom.",
                  "They choose a day, an activity, and their favourite flowers.",
                ],
              ]
            : [
                [
                  "01",
                  "Sentuhan peribadi.",
                  "Nama mereka. Kata-kata anda. Nota kecil dari hati.",
                ],
                [
                  "02",
                  "Hantar kejutan kecil.",
                  "Kongsi pautan. Mereka buka sampul khas untuk mereka.",
                ],
                [
                  "03",
                  "Biarkan ia mekar.",
                  "Mereka pilih tarikh, aktiviti, dan bunga kegemaran.",
                ],
              ]
          ).map(([num, title, desc], i) => (
            <article className="step-card" key={num}>
              <div className="step-top">
                <span>{num}</span>
                {i === 0 ? <Heart /> : i === 1 ? <Mail /> : <CalendarDays />}
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-bottom">
        <Sprig />
        <h2>
          {en ? (
            <>
              Big feelings.
              <br />
              <em>A beautifully small gesture.</em>
            </>
          ) : (
            <>
              Perasaan mendalam.
              <br />
              <em>Sentuhan kecil yang indah.</em>
            </>
          )}
        </h2>
        <Link href="/create" className="btn">
          {en ? "Make their day" : "Ceriakan hari mereka"}{" "}
          <ArrowUpRight size={17} />
        </Link>
        <p>
          <Check size={14} />
          {en
            ? "Their answer is always theirs."
            : "Pilihan mereka sentiasa dihormati."}
        </p>
      </section>
    </>
  );
}
