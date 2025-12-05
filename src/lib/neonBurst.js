const COLORS = ['#00e5ff', '#ff00cc', '#b388ff'];
const SHAPES = [
  'polygon(50% 0%, 0% 100%, 100% 100%)', // triangle
  'polygon(50% 0%, 0% 38%, 0% 100%, 50% 62%, 100% 100%, 100% 38%)', // hexagon-ish
  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // diamond
  'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)' // hexagon
];

export function triggerNeonBurst(targetEl, opts = {}) {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const container = document.createElement('div');
  container.className = 'neon-burst-container';
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  const count = opts.count || 12;

  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'neon-shape-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '50%';
    wrapper.style.top = '50%';
    wrapper.style.transform = 'translate(-50%, -50%)';

    const piece = document.createElement('div');
    piece.className = 'neon-shape-piece';

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = Math.floor(6 + Math.random() * 14); // 6-20px
    const distance = Math.floor(30 + Math.random() * 90); // 30-120px
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const rot = Math.floor(Math.random() * 360) + 'deg';
    const scale = (0.8 + Math.random() * 0.8).toFixed(2);
    const duration = (0.6 + Math.random() * 0.5).toFixed(2) + 's';
    const delay = (Math.random() * 0.05).toFixed(2) + 's';

    piece.style.setProperty('--dx', dx + 'px');
    piece.style.setProperty('--dy', dy + 'px');
    piece.style.setProperty('--rz', rot);
    piece.style.setProperty('--sc', scale);
    piece.style.width = size + 'px';
    piece.style.height = size + 'px';
    piece.style.background = color;
    piece.style.clipPath = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    piece.style.boxShadow = `0 0 8px ${color}, 0 0 16px ${color}`;
    piece.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.4))';
    piece.style.opacity = '0.95';
    piece.style.animation = `neon-shape-burst ${duration} ease-out ${delay} forwards`;

    wrapper.appendChild(piece);
    container.appendChild(wrapper);
  }

  // Ensure target has positioning context
  const prevPos = getComputedStyle(targetEl).position;
  if (prevPos === 'static' || !prevPos) {
    targetEl.style.position = 'relative';
  }

  targetEl.appendChild(container);

  const remove = () => container.remove();
  container.addEventListener('animationend', (e) => {
    // Remove after last animation finishes
    if ([...container.querySelectorAll('.neon-shape-piece')].every(el => el.getAnimations && el.getAnimations().length === 0)) {
      remove();
    }
  });
  // Safety cleanup
  setTimeout(remove, 1500);
}
