import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Instagram,
  Mail,
  Menu,
  Music2,
  Pause,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from "lucide-react";

const ASSETS = {
  hero: "/manus-storage/sama-hero-editorial_57cebdf1.jpg",
  heroMobile: "/manus-storage/sama-hero-portrait_49aa8be9.jpg",
  smoke: "/manus-storage/sama-smoke-overlay_55f6ef76.png",
  ruh: "/manus-storage/sama-ruh-cover_805ef1b1.jpg",
  story: "/manus-storage/sama-band-story_96785e63.jpg",
  live: "/manus-storage/sama-live_903cd9d8.jpg",
  arch: "/manus-storage/sama-arch_8fec2a0f.jpg",
};

type Track = { title: string; duration: number; time: string };

const tracks: Track[] = [
  { title: "Ruh", duration: 312, time: "05:12" },
  { title: "Ishq Ka Safar", duration: 363, time: "06:03" },
  { title: "Faqeer", duration: 288, time: "04:48" },
  { title: "Tu Hi Tu", duration: 431, time: "07:11" },
  { title: "Manzil", duration: 326, time: "05:26" },
];

const shows = [
  { day: "12", month: "OCT", city: "New Delhi", venue: "Kamani Auditorium", note: "An evening of Sufi music" },
  { day: "25", month: "OCT", city: "Jaipur", venue: "Jawahar Kala Kendra", note: "Under the autumn sky" },
];

const gallery = [
  { image: ASSETS.live, title: "A room full of listening", place: "New Delhi · Live" },
  { image: ASSETS.story, title: "Before the first note", place: "Old Delhi · Rehearsal" },
  { image: ASSETS.arch, title: "Where the echo begins", place: "Rajasthan · On the road" },
  { image: ASSETS.hero, title: "The space between songs", place: "SAMA · Live" },
];

type AudioRig = { context: AudioContext; master: GainNode; voices: OscillatorNode[] };

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.58);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const audioRig = useRef<AudioRig | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const dragState = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const didDragGallery = useRef(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const ensureAudio = async (trackIndex: number) => {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) {
      notify("Audio preview is not supported in this browser.");
      return false;
    }
    if (!audioRig.current) {
      const context = new AudioContextClass();
      const master = context.createGain();
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 980;
      master.gain.value = muted ? 0 : volume * 0.13;
      filter.connect(master);
      master.connect(context.destination);
      const voices: OscillatorNode[] = [];
      const fundamentals = [110, 164.81, 220];
      fundamentals.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();
        oscillator.type = index === 2 ? "triangle" : "sine";
        oscillator.frequency.value = frequency * (1 + trackIndex * 0.015);
        voiceGain.gain.value = index === 0 ? 0.62 : index === 1 ? 0.24 : 0.12;
        oscillator.connect(voiceGain);
        voiceGain.connect(filter);
        oscillator.start();
        voices.push(oscillator);
      });
      audioRig.current = { context, master, voices };
    } else {
      const base = [110, 164.81, 220];
      audioRig.current.voices.forEach((voice, index) => {
        voice.frequency.setTargetAtTime(base[index] * (1 + trackIndex * 0.015), audioRig.current!.context.currentTime, 0.8);
      });
    }
    await audioRig.current.context.resume();
    return true;
  };

  const startTrack = async (index: number) => {
    setActiveTrack(index);
    setCurrentTime(0);
    const ready = await ensureAudio(index);
    if (ready) setPlaying(true);
  };

  const togglePlayback = async () => {
    if (playing) {
      await audioRig.current?.context.suspend();
      setPlaying(false);
      return;
    }
    const ready = await ensureAudio(activeTrack);
    if (ready) setPlaying(true);
  };

  const skip = (direction: number) => {
    const next = shuffle
      ? Math.floor(Math.random() * tracks.length)
      : (activeTrack + direction + tracks.length) % tracks.length;
    void startTrack(next);
  };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCurrentTime((time) => {
        const nextTime = time + 1;
        if (nextTime >= tracks[activeTrack].duration) {
          if (repeat) {
            void startTrack(activeTrack);
          } else {
            const nextIndex = shuffle
              ? Math.floor(Math.random() * tracks.length)
              : (activeTrack + 1) % tracks.length;
            void startTrack(nextIndex);
          }
          return 0;
        }
        return nextTime;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, activeTrack, repeat, shuffle]);

  useEffect(() => {
    if (!audioRig.current) return;
    audioRig.current.master.gain.setTargetAtTime(muted ? 0 : volume * 0.13, audioRig.current.context.currentTime, 0.2);
  }, [volume, muted]);

  useEffect(() => {
    const reveal = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          reveal.unobserve(entry.target);
        }
      }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((item) => reveal.observe(item));
    return () => reveal.disconnect();
  }, []);

  useEffect(() => {
    const node = galleryRef.current;
    if (!node) return;
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        node.scrollLeft += event.deltaY;
      }
    };
    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowRight") setLightbox((index) => index === null ? null : (index + 1) % gallery.length);
      if (event.key === "ArrowLeft") setLightbox((index) => index === null ? null : (index - 1 + gallery.length) % gallery.length);
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  useEffect(() => {
    const cursor = document.querySelector<HTMLElement>(".custom-cursor");
    if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;
    const move = (event: MouseEvent) => {
      cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cursor]");
      cursor.dataset.label = target?.dataset.cursor ?? "";
      cursor.classList.toggle("cursor-active", Boolean(target?.dataset.cursor));
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const prefersCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const parallaxItems = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax-speed]"));
    let frame = 0;
    const updateScrollDepth = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const heroRect = hero.getBoundingClientRect();
        const heroShift = Math.max(-24, Math.min(24, -heroRect.top * 0.035));
        hero.style.setProperty("--hero-scroll-y", `${heroShift}px`);
        parallaxItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const speed = Number(item.dataset.parallaxSpeed ?? "0.025");
          const delta = (window.innerHeight * 0.5 - (rect.top + rect.height * 0.5)) * speed;
          item.style.setProperty("--scroll-parallax", `${Math.max(-22, Math.min(22, delta))}px`);
        });
      });
    };
    const moveCamera = (event: PointerEvent) => {
      if (prefersCoarsePointer || event.pointerType === "touch") return;
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 16;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 12;
      hero.style.setProperty("--parallax-bg-x", `${-x * 0.42}px`);
      hero.style.setProperty("--parallax-bg-y", `${-y * 0.42}px`);
      hero.style.setProperty("--parallax-text-x", `${x * 0.28}px`);
      hero.style.setProperty("--parallax-text-y", `${y * 0.28}px`);
    };
    const settleCamera = () => {
      hero.style.setProperty("--parallax-bg-x", "0px");
      hero.style.setProperty("--parallax-bg-y", "0px");
      hero.style.setProperty("--parallax-text-x", "0px");
      hero.style.setProperty("--parallax-text-y", "0px");
    };
    hero.addEventListener("pointermove", moveCamera);
    hero.addEventListener("pointerleave", settleCamera);
    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    window.addEventListener("resize", updateScrollDepth, { passive: true });
    updateScrollDepth();
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", moveCamera);
      hero.removeEventListener("pointerleave", settleCamera);
      window.removeEventListener("scroll", updateScrollDepth);
      window.removeEventListener("resize", updateScrollDepth);
    };
  }, []);

  useEffect(() => () => {
    void audioRig.current?.context.close();
  }, []);

  const currentTrack = tracks[activeTrack];
  const progress = currentTrack.duration ? (currentTime / currentTrack.duration) * 100 : 0;

  const changeLightbox = (direction: number) => {
    setLightbox((index) => index === null ? null : (index + direction + gallery.length) % gallery.length);
  };

  return (
    <main className="sama-site">
      <div className="custom-cursor" aria-hidden="true" />
      <header className="site-header">
        <a href="#home" className="wordmark" aria-label="SAMA home">Sama<span className="wordmark-dot">.</span></a>
        <nav className={`main-nav ${menuOpen ? "nav-open" : ""}`} aria-label="Main navigation">
          {[["Music", "#music"], ["The band", "#story"], ["Live", "#live"], ["Gallery", "#gallery"]].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
          <a className="nav-contact" href="#contact" onClick={() => setMenuOpen(false)}>Get in touch <ArrowUpRight size={13} /></a>
        </nav>
        <div className="header-right">
          <div className="header-socials" aria-label="Social platforms">
            <button aria-label="Connect SAMA Instagram" onClick={() => notify("Add SAMA’s official Instagram link here.")}><Instagram size={15} /></button>
            <button aria-label="Connect SAMA YouTube" onClick={() => notify("Add SAMA’s official YouTube link here.")}><Youtube size={16} /></button>
            <button aria-label="Connect SAMA Spotify" onClick={() => notify("Add SAMA’s official Spotify link here.")}><Music2 size={15} /></button>
          </div>
          <span className="header-note"><i /> Independent Sufi collective</span>
          <button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <section className="hero" id="home" ref={heroRef}>
        <div className="hero-image-layer" style={{ "--hero-desktop-image": `url(${ASSETS.hero})`, "--hero-mobile-image": `url(${ASSETS.heroMobile})` } as React.CSSProperties} />
        <div className="hero-shade" />
        <img className="hero-smoke hero-smoke-back" src={ASSETS.smoke} alt="" aria-hidden="true" />
        <img className="hero-smoke hero-smoke-front" src={ASSETS.smoke} alt="" aria-hidden="true" />
        <div className="hero-mobile-smoke" aria-hidden="true" />
        <div className="hero-arch-line" aria-hidden="true"><span /></div>
        <span className="hero-dust hero-dust-one" aria-hidden="true" />
        <span className="hero-dust hero-dust-two" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> Music for the inward journey</p>
          <h1>Sama</h1>
          <div className="hero-subtitle">A journey within</div>
          <p className="hero-copy">Sufi music for<br />a quieter world.</p>
          <div className="hero-actions">
            <button className="button button-gold" onClick={() => void startTrack(0)} data-cursor="LISTEN"><span className="button-play"><Play size={12} fill="currentColor" /></span> Listen now</button>
            <a className="text-link" href="#story" data-cursor="DISCOVER">Discover SAMA <ArrowDownRight size={16} /></a>
          </div>
        </div>
        <div className="hero-side-note"><span>01 — 05</span><span className="hero-side-rule" /><span>LOVE · MUSIC · PEACE</span></div>
        <aside className="hero-quote"><p>Music<br />is a prayer<br />the heart sings<br />when words<br />fall silent.</p><span /></aside>
        <a className="scroll-indicator" href="#music" aria-label="Scroll to latest release"><span>Scroll to listen</span><ArrowDown size={15} /></a>
        <span className="hero-coordinate">28° 36′ N&nbsp;&nbsp; 77° 13′ E</span>
      </section>

      <div className="sound-strip" aria-label="SAMA in one line">
        <span>AN INVITATION TO LISTEN</span><i /><span>एक धुन, अनेक दिल</span><i /><span>LOVE · MUSIC · PEACE · HUMANITY</span><i /><span>AN INVITATION TO LISTEN</span>
      </div>

      <section className="release section-dark" id="music">
        <div className="section-topline reveal"><span>01 / THE MUSIC</span><span>Latest release&nbsp; · &nbsp;2026</span></div>
        <div className="release-grid">
          <div className="release-copy reveal">
            <p className="eyebrow"><span className="eyebrow-line" /> Latest release</p>
            <h2>Ruh<span className="gold-period">.</span></h2>
            <p className="release-description">A collection of Sufi compositions that travel through love, longing and the infinite within.</p>
            <button className="button button-outline" onClick={() => void startTrack(0)} data-cursor="LISTEN">Listen to the EP <ArrowRight size={15} /></button>
          </div>
          <div className="release-art-column reveal">
            <div className={`album-stage ${playing ? "album-playing" : ""}`}>
              <div className="album-shadow" />
              <button className="album-sleeve" onClick={() => setExpanded(!expanded)} aria-label="Expand the music player" data-cursor="OPEN PLAYER">
                <img src={ASSETS.ruh} alt="Ruh album artwork: a musician beneath an illuminated arch" />
                <span className="sleeve-caption"><span>SAMA</span><span>R U H · MMXXVI</span></span>
              </button>
              <div className="vinyl-disc" aria-hidden="true"><div className="vinyl-grooves" /><div className="vinyl-label"><span>S</span></div></div>
              <button className="album-play" onClick={() => void startTrack(0)} aria-label={playing ? "Restart Ruh" : "Play Ruh"} data-cursor="LISTEN"><Play size={15} fill="currentColor" /></button>
            </div>
            <div className="art-caption"><span>THE NEW EP</span><span>5 SONGS · 28 MIN</span></div>
          </div>
          <div className="release-track-column reveal">
            <p className="tracklist-heading">The Ruh sessions <span>05 tracks</span></p>
            <div className="track-list" role="list" aria-label="Ruh track list">
              {tracks.map((track, index) => (
                <button key={track.title} className={`track-row ${activeTrack === index && playing ? "track-active" : ""}`} onClick={() => void startTrack(index)} role="listitem" data-cursor="LISTEN">
                  <span className="track-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="track-name">{track.title}</span>
                  <span className="track-wave" aria-hidden="true">{Array.from({ length: 16 }, (_, bar) => <i key={bar} style={{ "--bar": `${7 + ((bar * 13 + index * 5) % 18)}px` } as React.CSSProperties} />)}</span>
                  <span className="track-duration">{track.time}</span>
                  <span className="track-action">{activeTrack === index && playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</span>
                </button>
              ))}
            </div>
            <p className="release-footnote">A gentle, browser-generated soundscape preview plays when you press listen.</p>
          </div>
        </div>
      </section>

      <section className="story" id="story">
        <div className="story-image-wrap reveal">
          <img src={ASSETS.story} alt="SAMA musicians share a quiet moment after rehearsal" data-parallax-speed="0.025" />
          <span className="image-index">A SHARED PRACTICE — 2026</span>
          <div className="story-image-mark">S<span>.</span></div>
        </div>
        <div className="story-copy reveal">
          <p className="eyebrow dark-eyebrow"><span className="eyebrow-line" /> 02 / The band</p>
          <h2>A shared love<br />for <em>Sufi traditions.</em></h2>
          <p>We are musicians drawn together by a simple belief: a song can open a door that words cannot. SAMA brings the poetry, pulse and devotional spirit of Sufi music into a sound that belongs to the present.</p>
          <p>Rooted in the mehfil, made for every room. Old melodies, new ears — and always, a place for everyone in the circle.</p>
          <a className="text-link dark-link" href="#contact" data-cursor="SAY HELLO">Our story <ArrowRight size={16} /></a>
          <span className="story-side-ornament" aria-hidden="true">صَما</span>
        </div>
        <span className="story-watermark" aria-hidden="true">SAMA</span>
      </section>

      <section className="ishq" style={{ backgroundImage: `linear-gradient(90deg, rgba(11,13,12,.93), rgba(11,13,12,.42)), url(${ASSETS.arch})` }}>
        <div className="ishq-grid" aria-hidden="true" />
        <div className="ishq-content reveal">
          <span className="ishq-number">A WORD THAT HOLDS A WORLD</span>
          <div className="ishq-3d-object"><div className="ishq-calligraphy" lang="ar" dir="rtl">عشق</div></div>
          <p className="ishq-translation">ISHQ <span>—</span> LOVE, IN ITS MOST UNBOUND FORM</p>
          <div className="ishq-rule" />
          <p className="ishq-mantra">Love&nbsp; · &nbsp;Music&nbsp; · &nbsp;Peace&nbsp; · &nbsp;Humanity</p>
        </div>
        <span className="ishq-edge-note">03 — AN INFINITE SONG</span>
      </section>

      <section className="live-section section-dark" id="live">
        <div className="section-topline reveal"><span>03 / GATHER WITH US</span><span>India · Autumn 2026</span></div>
        <div className="live-heading reveal">
          <div><p className="eyebrow"><span className="eyebrow-line" /> Upcoming performances</p><h2>Come as<br /><em>you are.</em></h2></div>
          <p className="live-intro">No two mehfils are ever the same.<br />We would love to see you there.</p>
        </div>
        <div className="show-list">
          {shows.map((show, index) => (
            <article className="show-card reveal" key={show.city} style={{ backgroundImage: `linear-gradient(90deg, rgba(17,25,23,.96) 0%, rgba(17,25,23,.88) 55%, rgba(17,25,23,.28) 100%), url(${index === 0 ? ASSETS.live : ASSETS.arch})` }}>
              <div className="show-date"><span>{show.month}</span><strong>{show.day}</strong></div>
              <div className="show-details"><p>{show.note}</p><h3>{show.city}</h3><span>{show.venue}</span></div>
              <button className="show-link" onClick={() => notify("Ticketing details will be announced soon.")} data-cursor="EVENT DETAILS">Event details <ArrowUpRight size={15} /></button>
              <span className="show-index">0{index + 1}</span>
            </article>
          ))}
        </div>
        <p className="event-note">Dates and venues shown as a starting point — add confirmed ticket links before launch.</p>
      </section>

      <section className="gallery-section" id="gallery">
        <div className="gallery-header reveal">
          <div><p className="eyebrow dark-eyebrow"><span className="eyebrow-line" /> 04 / On the road</p><h2>Fragments of <em>the feeling.</em></h2></div>
          <div className="gallery-instructions"><span>DRAG TO WANDER</span><ArrowRight size={16} /></div>
        </div>
        <div className="gallery-track" ref={galleryRef} aria-label="SAMA photo gallery" data-cursor="DRAG"
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            dragState.current = { startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
            didDragGallery.current = false;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragState.current) return;
            const distance = event.clientX - dragState.current.startX;
            if (Math.abs(distance) > 4) didDragGallery.current = true;
            if (didDragGallery.current) {
              event.preventDefault();
              event.currentTarget.scrollLeft = dragState.current.scrollLeft - distance;
              event.currentTarget.classList.add("is-dragging");
            }
          }}
          onPointerUp={(event) => {
            dragState.current = null;
            event.currentTarget.classList.remove("is-dragging");
            window.setTimeout(() => { didDragGallery.current = false; }, 0);
          }}
          onPointerCancel={(event) => {
            dragState.current = null;
            event.currentTarget.classList.remove("is-dragging");
          }}
          onClickCapture={(event) => {
            if (!didDragGallery.current) return;
            event.preventDefault();
            event.stopPropagation();
            didDragGallery.current = false;
          }}>
          {gallery.map((item, index) => (
            <button className={`gallery-card gallery-card-${index + 1} reveal`} key={item.title} onClick={() => setLightbox(index)} aria-label={`Open photo: ${item.title}`}>
              <img src={item.image} alt={item.title} draggable={false} data-parallax-speed="0.014" />
              <span className="gallery-card-number">0{index + 1}</span>
              <span className="gallery-card-caption"><strong>{item.title}</strong><small>{item.place}</small></span>
              <span className="gallery-open"><ArrowUpRight size={16} /></span>
            </button>
          ))}
        </div>
        <div className="gallery-bottom"><span>THE SONG CONTINUES</span><span>01 — 04</span></div>
      </section>

      <section className="contact-band" id="contact">
        <div className="contact-inner reveal">
          <span className="contact-kicker">FOR BOOKINGS, COLLABORATIONS & KIND WORDS</span>
          <h2>Let's meet<br /><em>in the music.</em></h2>
          <button className="button button-gold" onClick={() => notify("Add your preferred booking email or contact link here.")} data-cursor="SAY HELLO">Write to SAMA <Mail size={15} /></button>
        </div>
        <span className="contact-ornament" lang="ar" aria-hidden="true">محبت</span>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
        <a href="#home" className="footer-mark">Sama<span>.</span></a>
          <p>Music beyond words.<br />For a more human tomorrow.</p>
          <div className="footer-socials">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={18} /></a>
          </div>
          <a className="back-top" href="#home">Back to the beginning <ArrowUpRight size={14} /></a>
        </div>
        <div className="footer-bottom"><span>© 2026 SAMA COLLECTIVE</span><span>MADE OF LOVE, MUSIC & A LITTLE DUST</span><span>INDEPENDENT BY NATURE</span></div>
      </footer>

      <aside className={`music-player ${expanded ? "player-expanded" : ""}`} aria-label="Music player">
        {expanded && <div className="player-expanded-panel">
          <div className="expanded-top"><div><span className="player-overline">NOW IN THE CIRCLE</span><h3>The Ruh sessions</h3></div><button className="icon-button" onClick={() => setExpanded(false)} aria-label="Collapse player"><ChevronDown size={18} /></button></div>
          <div className="expanded-tracks">{tracks.map((track, index) => <button key={track.title} className={activeTrack === index ? "expanded-track selected" : "expanded-track"} onClick={() => void startTrack(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{track.title}</strong><small>{track.time}</small>{activeTrack === index && playing ? <Pause size={13} /> : <Play size={13} />}</button>)}</div>
        </div>}
        <div className="player-bar">
          <button className={`player-art ${playing ? "spinning" : ""}`} onClick={() => setExpanded(!expanded)} aria-label="Open track list"><img src={ASSETS.ruh} alt="" /><span /></button>
          <button className="player-track" onClick={() => setExpanded(!expanded)} aria-label="Show track list"><strong>{currentTrack.title}</strong><span>SAMA · RUH</span></button>
          <span className="player-time">{formatTime(currentTime)}</span>
          <div className="player-progress"><input type="range" min="0" max={currentTrack.duration} value={currentTime} aria-label="Track progress" style={{ "--progress": `${progress}%` } as React.CSSProperties} onChange={(event) => setCurrentTime(Number(event.target.value))} /><div><span>{formatTime(currentTime)}</span><span>{currentTrack.time}</span></div></div>
          <div className="player-controls">
            <button className={shuffle ? "is-on" : ""} onClick={() => setShuffle(!shuffle)} aria-label="Toggle shuffle"><Shuffle size={15} /></button>
            <button onClick={() => skip(-1)} aria-label="Previous track"><SkipBack size={16} fill="currentColor" /></button>
            <button className="main-play" onClick={() => void togglePlayback()} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
            <button onClick={() => skip(1)} aria-label="Next track"><SkipForward size={16} fill="currentColor" /></button>
            <button className={repeat ? "is-on" : ""} onClick={() => setRepeat(!repeat)} aria-label="Toggle repeat"><Repeat2 size={15} /></button>
          </div>
          <div className="player-volume"><button onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute" : "Mute"}>{muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button><input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} aria-label="Volume" onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} /></div>
          <button className="player-expand" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Collapse player" : "Expand player"}>{expanded ? <ChevronDown size={17} /> : <ArrowUpRight size={16} />}</button>
        </div>
      </aside>

      {lightbox !== null && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setLightbox(null)}>
        <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Close gallery"><X size={21} /></button>
        <button className="lightbox-arrow lightbox-prev" onClick={(event) => { event.stopPropagation(); changeLightbox(-1); }} aria-label="Previous image"><ArrowLeft size={19} /></button>
        <figure onClick={(event) => event.stopPropagation()}><img src={gallery[lightbox].image} alt={gallery[lightbox].title} /><figcaption><span>{gallery[lightbox].place}</span><strong>{gallery[lightbox].title}</strong><small>{String(lightbox + 1).padStart(2, "0")} / {String(gallery.length).padStart(2, "0")}</small></figcaption></figure>
        <button className="lightbox-arrow lightbox-next" onClick={(event) => { event.stopPropagation(); changeLightbox(1); }} aria-label="Next image"><ArrowRight size={19} /></button>
      </div>}

      <div className={`toast-message ${toast ? "toast-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </main>
  );
}
