const SOUND_PATHS = {
  addToCart: '/sounds/Adding a Product to Cart.mp3',
  confirmProduct: '/sounds/Confirming the Product.mp3',
  placingOrder: '/sounds/Placing an Order.mp3',
};

export function playSound(key, options = {}) {
  const src = SOUND_PATHS[key];
  if (!src) return null;
  const { volume = 1.0 } = options;
  try {
    const audio = new Audio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.catch(() => {});
    }
    return audio;
  } catch {
    return null;
  }
}
