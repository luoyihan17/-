import { useEffect, useRef, useState } from 'react';

// One clock controls both the hold and transition, and freezes while paused.
export default function useLyrics({ text, nextText, lyricAuto, lyricHold, lyricDuration, lyricAnimation }, paused) {
  const [frame, setFrame] = useState({ index: 0, opacity: 1, y: 0 });
  const clock = useRef({ index: 0, elapsed: 0, transition: false });
  const switchLyric = () => {
    const c = clock.current;
    if (c.transition) return;
    c.elapsed = 0;
    if (paused || lyricAnimation === 'none') {
      c.index = 1 - c.index;
      setFrame({ index: c.index, opacity: 1, y: 0 });
    } else { c.transition = true; }
  };
  useEffect(() => {
    clock.current = { index: 0, elapsed: 0, transition: false };
    setFrame({ index: 0, opacity: 1, y: 0 });
  }, [text, nextText]);
  useEffect(() => {
    if (paused) return;
    let id, last;
    const tick = now => {
      const c = clock.current;
      c.elapsed += last === undefined ? 0 : Math.min(now - last, 100);
      last = now;
      if (!c.transition && lyricAuto && c.elapsed >= lyricHold * 1000) {
        c.elapsed = 0;
        if (lyricAnimation === 'none') {
          c.index = 1 - c.index;
          setFrame({ index: c.index, opacity: 1, y: 0 });
        } else { c.transition = true; }
      }
      if (c.transition) {
        const p = lyricAnimation === 'none' ? 1 : Math.min(c.elapsed / (lyricDuration * 1000), 1);
        const incoming = p >= 0.5;
        const opacity = Math.abs(2 * p - 1);
        setFrame({ index: incoming ? 1 - c.index : c.index, opacity,
          y: lyricAnimation === 'slide' && !incoming ? (2 * p) ** 2 * 96 : 0 });
        if (p === 1) {
          c.index = 1 - c.index;
          c.elapsed = 0;
          c.transition = false;
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [paused, lyricAuto, lyricHold, lyricDuration, lyricAnimation]);
  return { index: frame.index, text: frame.index === 0 ? text : nextText, switchLyric,
    style: { opacity: frame.opacity, transform: `translateY(${frame.y}px)` } };
}
