import Marquee from './kit/Marquee';

const A = ['Worlds first', 'Websites second', 'No templates', '13 sites shipped', 'Built in Hyderabad'];
const B = ['three.js', 'Blender', 'Unreal Engine 5', 'GLSL', 'GSAP', 'React', 'WebGL'];

function Row({ words, outline = false }: { words: string[]; outline?: boolean }) {
  return (
    <>
      {words.map((w) => (
        <span key={w} className="flex items-center">
          <span className={`display px-[2.2vw] text-[clamp(2.6rem,6.4vw,6.4rem)] leading-[1.05] ${outline ? 'text-outline' : ''}`}>{w}</span>
          <span aria-hidden="true" className="text-[clamp(1.2rem,2.4vw,2.4rem)]">
            ✦
          </span>
        </span>
      ))}
    </>
  );
}

/** Two tapes crossing the page. They speed up with the scroll and turn round with it. */
export default function Bands() {
  return (
    <section aria-label="What I work with" className="relative z-[3] h-[46vh] min-h-[320px] overflow-hidden bg-ink">
      <div className="absolute top-1/2 left-[-10vw] w-[120vw] -translate-y-[70%] rotate-[3deg] bg-bone/[0.04] py-3 text-bone/80">
        <Marquee speed={50} reverse>
          <Row words={B} outline />
        </Marquee>
      </div>
      <div className="absolute top-1/2 left-[-10vw] w-[120vw] -translate-y-[10%] -rotate-[4deg] bg-[var(--accent)] py-3 text-ink shadow-[0_30px_80px_-20px_var(--accent)]">
        <Marquee speed={70}>
          <Row words={A} />
        </Marquee>
      </div>
    </section>
  );
}
