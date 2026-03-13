// Simple IntersectionObserver to trigger scroll animations.
// Elements just need data-animate on them; CSS handles how they animate.

document.addEventListener('DOMContentLoaded', () => {
  const animated = document.querySelectorAll('[data-animate]');
  if (!('IntersectionObserver' in window) || animated.length === 0) {
    // Fallback: show everything immediately.
    animated.forEach((el) => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -5% 0px', // fire a little before fully in view
    }
  );

  animated.forEach((el) => observer.observe(el));
});

