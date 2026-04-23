/* ═══════════════════════════════════════════════════
   ANIMATIONS — preset library, combinable
   Each animation is a CSS keyframe definition + base props.
   Multiple can be layered on one element using CSS's support
   for multiple comma-separated animations.
═══════════════════════════════════════════════════ */

window.Anim = (function() {

  /* Each preset provides: a CSS keyframes rule, and a default shorthand. */
  const PRESETS = {
    wiggle: {
      label: 'wiggle',
      keyframes: `
        @keyframes anim-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-4deg); }
          75% { transform: rotate(4deg); }
        }`,
      animation: 'anim-wiggle 1.4s ease-in-out infinite',
    },
    bounce: {
      label: 'bounce',
      keyframes: `
        @keyframes anim-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }`,
      animation: 'anim-bounce 1.2s cubic-bezier(.5,0,.5,1) infinite',
    },
    float: {
      label: 'float',
      keyframes: `
        @keyframes anim-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }`,
      animation: 'anim-float 3.2s ease-in-out infinite',
    },
    pulse: {
      label: 'pulse',
      keyframes: `
        @keyframes anim-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }`,
      animation: 'anim-pulse 1.6s ease-in-out infinite',
    },
    spin: {
      label: 'spin',
      keyframes: `
        @keyframes anim-spin {
          to { transform: rotate(360deg); }
        }`,
      animation: 'anim-spin 6s linear infinite',
    },
    shake: {
      label: 'shake',
      keyframes: `
        @keyframes anim-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }`,
      animation: 'anim-shake 0.6s ease-in-out infinite',
    },
    fadeInOut: {
      label: 'fade in/out',
      keyframes: `
        @keyframes anim-fadeio {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }`,
      animation: 'anim-fadeio 2.4s ease-in-out infinite',
    },
    breathe: {
      label: 'breathe',
      keyframes: `
        @keyframes anim-breathe {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          50% { transform: scaleY(1.05) scaleX(1.03); }
        }`,
      animation: 'anim-breathe 3s ease-in-out infinite',
    },
    sway: {
      label: 'sway',
      keyframes: `
        @keyframes anim-sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }`,
      animation: 'anim-sway 2.2s ease-in-out infinite',
    },
    // One-shots used during surprise reveals
    fly: {
      label: 'fly across',
      oneShot: true,
      keyframes: `
        @keyframes anim-fly {
          0%   { opacity: 0; transform: translateX(-120px) translateY(20px); }
          10%  { opacity: 1; }
          50%  { transform: translateX(0) translateY(-10px); }
          90%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(200px) translateY(-30px); }
        }`,
      animation: 'anim-fly 4s linear forwards',
    },
    jump: {
      label: 'jump up',
      oneShot: true,
      keyframes: `
        @keyframes anim-jump {
          0% { opacity: 0; transform: translateY(40px) scale(0.6); }
          30% { opacity: 1; transform: translateY(-40px) scale(1.05); }
          70% { transform: translateY(-20px) scale(1.08); }
          100% { opacity: 0; transform: translateY(50px) scale(0.8); }
        }`,
      animation: 'anim-jump 1.6s ease-out forwards',
    },
    pop: {
      label: 'pop in',
      oneShot: true,
      keyframes: `
        @keyframes anim-popin {
          0% { opacity: 0; transform: scale(0.3); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }`,
      animation: 'anim-popin 0.5s cubic-bezier(.2,1.3,.4,1) forwards',
    },
  };

  const LOOPING_NAMES   = ['wiggle', 'bounce', 'float', 'pulse', 'spin', 'shake', 'fadeInOut', 'breathe', 'sway'];
  const ONE_SHOT_NAMES  = ['fly', 'jump', 'pop'];

  /* Inject all keyframes into the document once */
  let injected = false;
  function injectKeyframes() {
    if (injected) return;
    const style = document.createElement('style');
    style.id = 'anim-presets-style';
    style.textContent = Object.values(PRESETS).map(p => p.keyframes).join('\n');
    document.head.appendChild(style);
    injected = true;
  }

  /* Apply a list of animation names to an element by setting its animation CSS. */
  function apply(el, names) {
    injectKeyframes();
    if (!names || names.length === 0) {
      el.style.animation = '';
      return;
    }
    const list = names
      .filter(n => PRESETS[n])
      .map(n => PRESETS[n].animation);
    el.style.animation = list.join(', ');
  }

  return {
    PRESETS,
    LOOPING_NAMES,
    ONE_SHOT_NAMES,
    apply,
    injectKeyframes,
  };
})();
