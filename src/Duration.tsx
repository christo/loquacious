import {useEffect, useState} from "react";

/**
 * Formats to hh:mm:ss or mm:ss
 * if run is true, increment the time each second
 */
export function Duration({ms, className, run = false}: { ms: number, className?: string, run: boolean }) {
  const [elapsed, setElapsed] = useState(ms);
  if (run) {
    useEffect(() => {
      const timer = setInterval(() => {
        setElapsed((prev) => prev + 1000);
      }, 1000);

      return () => clearInterval(timer); // Cleanup interval on component unmount
    }, []);
  }
  className = !className ? "" : className;
  let t = Math.floor(elapsed / 1000);
  const hours = Math.floor(t / 3600);
  t -= hours * 3600;
  const mins = Math.floor(t / 60);
  t -= mins * 60;
  const secs = t;
  const pad = (n: number) => ('0' + n).slice(-2);
  if (hours > 0) {
    return <span className={className}>{pad(hours)}:{pad(mins)}:{pad(secs)}</span>
  } else {
    return <span className={className}>{pad(mins)}:{pad(secs)}</span>;
  }
}