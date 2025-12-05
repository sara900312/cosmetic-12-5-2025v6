const COLORS = ['#00e5ff', '#ff00cc', '#b388ff'];

export function triggerNeonCascadingWave(targetEl, opts = {}) {
  if (!targetEl) return;
  const container = document.createElement('div');
  container.className = 'neon-wave-container';
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  const width = targetEl.clientWidth || 320;
  const height = targetEl.clientHeight || 200;

  const streakCount = opts.streaks || 26;
  for (let i = 0; i < streakCount; i++) {
    const streak = document.createElement('div');
    streak.className = 'neon-streak';

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const x = Math.random() * width; // random horizontal start
    const length = Math.floor(height * (0.35 + Math.random() * 0.5));
    const thickness = Math.floor(2 + Math.random() * 4);
    const drift = Math.floor(-20 + Math.random() * 40); // slight horizontal drift
    const duration = (0.9 + Math.random() * 0.9).toFixed(2) + 's';
    const delay = (Math.random() * 0.2).toFixed(2) + 's';
    const opacity = (0.5 + Math.random() * 0.5).toFixed(2);

    streak.style.setProperty('--x', x + 'px');
    streak.style.setProperty('--drift', drift + 'px');
    streak.style.setProperty('--len', length + 'px');
    streak.style.setProperty('--dur', duration);
    streak.style.setProperty('--delay', delay);
    streak.style.setProperty('--alpha', opacity);
    streak.style.background = `linear-gradient(to bottom, rgba(255,255,255,0), ${color}, rgba(255,255,255,0))`;
    streak.style.width = thickness + 'px';
    streak.style.height = length + 'px';
    streak.style.left = 'var(--x)';
    streak.style.top = '-20%';
    streak.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.5))';
    streak.style.boxShadow = `0 0 10px ${color}, 0 0 18px ${color}`;
    streak.style.opacity = 'var(--alpha)';
    streak.style.animation = `neon-streak-fall var(--dur) ease-out var(--delay) forwards`;

    container.appendChild(streak);
  }

  // Add a few glowing particles
  const particles = opts.particles || 18;
  for (let i = 0; i < particles; i++) {
    const p = document.createElement('div');
    p.className = 'neon-particle';

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const x = Math.random() * width;
    const size = Math.floor(2 + Math.random() * 3);
    const distance = Math.floor(height * (0.4 + Math.random() * 0.6));
    const drift = Math.floor(-30 + Math.random() * 60);
    const duration = (0.9 + Math.random() * 1.1).toFixed(2) + 's';
    const delay = (Math.random() * 0.25).toFixed(2) + 's';
    const opacity = (0.5 + Math.random() * 0.5).toFixed(2);

    p.style.setProperty('--x', x + 'px');
    p.style.setProperty('--drift', drift + 'px');
    p.style.setProperty('--dist', distance + 'px');
    p.style.setProperty('--dur', duration);
    p.style.setProperty('--delay', delay);
    p.style.setProperty('--alpha', opacity);

    p.style.left = 'var(--x)';
    p.style.top = '-10%';
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.background = color;
    p.style.borderRadius = '50%';
    p.style.boxShadow = `0 0 6px ${color}, 0 0 12px ${color}`;
    p.style.opacity = 'var(--alpha)';
    p.style.animation = `neon-particle-fall var(--dur) ease-out var(--delay) forwards`;

    container.appendChild(p);
  }

  // Ensure target positioning context
  const prevPos = getComputedStyle(targetEl).position;
  const resetPos = prevPos === 'static' || !prevPos;
  if (resetPos) targetEl.style.position = 'relative';

  targetEl.appendChild(container);

  const cleanup = () => {
    container.remove();
    if (resetPos) targetEl.style.position = '';
  };

  // Cleanup after last animations
  setTimeout(cleanup, 2200);
}
