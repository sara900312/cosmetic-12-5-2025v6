export function setupImageMagnifier(containerEl, imgEl, options = {}) {
  if (!containerEl || !imgEl) return () => {};

  const opts = {
    zoom: typeof options.zoom === 'number' ? options.zoom : 2,
    size: typeof options.size === 'number' ? options.size : 140,
    radius: typeof options.radius === 'number' ? options.radius : 16,
  };

  let lens;
  let active = false;
  let imgRect;
  let containerRect;
  let imgRenderedWidth;
  let imgRenderedHeight;

  const ensureLens = () => {
    if (!lens) {
      lens = document.createElement('div');
      lens.className = 'magnifier-lens';
      lens.style.position = 'absolute';
      lens.style.width = `${opts.size}px`;
      lens.style.height = `${opts.size}px`;
      lens.style.borderRadius = `${opts.radius}px`;
      lens.style.pointerEvents = 'none';
      lens.style.opacity = '0';
      lens.style.transition = 'opacity 120ms ease';
      lens.style.willChange = 'transform, background-position, opacity';
      lens.style.backgroundRepeat = 'no-repeat';
      lens.style.boxShadow = '0 0 10px rgba(255,255,255,0.25), 0 0 18px rgba(147,51,234,0.35)';
      lens.style.border = '1px solid rgba(255,255,255,0.25)';
      lens.style.zIndex = '50';
      containerEl.appendChild(lens);
      const pos = getComputedStyle(containerEl).position;
      if (!pos || pos === 'static') {
        containerEl.style.position = 'relative';
      }
    }
  };

  const updateImgMetrics = () => {
    imgRect = imgEl.getBoundingClientRect();
    containerRect = containerEl.getBoundingClientRect();
    imgRenderedWidth = imgRect.width;
    imgRenderedHeight = imgRect.height;
    const bgWidth = Math.max(imgRenderedWidth * opts.zoom, 1);
    const bgHeight = Math.max(imgRenderedHeight * opts.zoom, 1);
    if (lens) {
      lens.style.backgroundImage = `url('${imgEl.src}')`;
      lens.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
    }
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const move = (clientX, clientY) => {
    if (!active) return;
    ensureLens();
    updateImgMetrics();

    // Position relative to image for background
    const localX = clientX - imgRect.left;
    const localY = clientY - imgRect.top;

    const clampedX = clamp(localX, 0, imgRenderedWidth);
    const clampedY = clamp(localY, 0, imgRenderedHeight);

    // Position lens relative to container top-left
    const imageOffsetX = imgRect.left - containerRect.left;
    const imageOffsetY = imgRect.top - containerRect.top;
    const lensLeft = imageOffsetX + clampedX - opts.size / 2;
    const lensTop = imageOffsetY + clampedY - opts.size / 2;

    const bgX = (clampedX * opts.zoom) - opts.size / 2;
    const bgY = (clampedY * opts.zoom) - opts.size / 2;

    lens.style.left = `${lensLeft}px`;
    lens.style.top = `${lensTop}px`;
    lens.style.backgroundPosition = `-${bgX}px -${bgY}px`;
  };

  const onMouseEnter = (e) => {
    ensureLens();
    updateImgMetrics();
    active = true;
    lens.style.opacity = '1';
    const cx = e?.clientX ?? (e?.touches && e.touches[0]?.clientX) ?? (imgRect.left + imgRect.width / 2);
    const cy = e?.clientY ?? (e?.touches && e.touches[0]?.clientY) ?? (imgRect.top + imgRect.height / 2);
    move(cx, cy);
  };

  // Pointer Events (cover mouse + touch + pen)
  const onPointerEnter = (e) => onMouseEnter(e);
  const onPointerLeave = () => onMouseLeave();
  const onPointerMove = (e) => onMouseMove(e);
  const onPointerDown = (e) => onMouseDown(e);
  const onMouseLeave = () => {
    if (lens) lens.style.opacity = '0';
    active = false;
  };
  const onMouseMove = (e) => {
    if (!active) onMouseEnter(e);
    move(e.clientX, e.clientY);
  };

  const onMouseDown = (e) => {
    onMouseEnter(e);
    move(e.clientX, e.clientY);
  };

  const onTouchStart = (e) => {
    ensureLens();
    updateImgMetrics();
    active = true;
    lens.style.opacity = '1';
    if (e.touches && e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e) => {
    if (!active) onTouchStart(e);
    if (e.touches && e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchEnd = () => onMouseLeave();

  const onResize = () => {
    if (!active) return;
    updateImgMetrics();
  };

  // Prefer Pointer Events for reliability; fall back remains
  containerEl.addEventListener('pointerenter', onPointerEnter);
  containerEl.addEventListener('pointerleave', onPointerLeave);
  containerEl.addEventListener('pointermove', onPointerMove);
  containerEl.addEventListener('pointerdown', onPointerDown);
  imgEl.addEventListener('pointerenter', onPointerEnter);
  imgEl.addEventListener('pointerleave', onPointerLeave);
  imgEl.addEventListener('pointermove', onPointerMove);
  imgEl.addEventListener('pointerdown', onPointerDown);

  // Touch fallbacks
  containerEl.addEventListener('touchstart', onTouchStart, { passive: true });
  containerEl.addEventListener('touchmove', onTouchMove, { passive: true });
  containerEl.addEventListener('touchend', onTouchEnd, { passive: true });

  window.addEventListener('resize', onResize);

  // image protection
  const prevent = (e) => e.preventDefault();
  imgEl.addEventListener('contextmenu', prevent);
  imgEl.addEventListener('dragstart', prevent);

  // initial bg
  ensureLens();
  updateImgMetrics();

  const onImgLoad = () => {
    updateImgMetrics();
  };
  if (imgEl.complete) {
    updateImgMetrics();
  } else {
    imgEl.addEventListener('load', onImgLoad);
  }
  // Ensure first hover works even if pointer already inside when listeners attach
  requestAnimationFrame(() => {
    updateImgMetrics();
    if (containerEl.matches(':hover')) {
      onMouseEnter({ clientX: imgRect.left + imgRect.width / 2, clientY: imgRect.top + imgRect.height / 2 });
    }
  });

  return () => {
    containerEl.removeEventListener('mouseenter', onMouseEnter);
    containerEl.removeEventListener('mouseleave', onMouseLeave);
    containerEl.removeEventListener('mousemove', onMouseMove);
    containerEl.removeEventListener('touchstart', onTouchStart);
    containerEl.removeEventListener('touchmove', onTouchMove);
    containerEl.removeEventListener('touchend', onTouchEnd);

    containerEl.removeEventListener('pointerenter', onPointerEnter);
    containerEl.removeEventListener('pointerleave', onPointerLeave);
    containerEl.removeEventListener('pointermove', onPointerMove);
    containerEl.removeEventListener('pointerdown', onPointerDown);
    imgEl.removeEventListener('pointerenter', onPointerEnter);
    imgEl.removeEventListener('pointerleave', onPointerLeave);
    imgEl.removeEventListener('pointermove', onPointerMove);
    imgEl.removeEventListener('pointerdown', onPointerDown);

    window.removeEventListener('resize', onResize);
    imgEl.removeEventListener('contextmenu', prevent);
    imgEl.removeEventListener('dragstart', prevent);
    imgEl.removeEventListener('load', onImgLoad);
    if (lens && lens.parentNode) lens.parentNode.removeChild(lens);
  };
}
