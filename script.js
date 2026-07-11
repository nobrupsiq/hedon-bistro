(function () {
  document.documentElement.classList.add("js");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===== Revelação ao rolar — IntersectionObserver, independente do GSAP ===== */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("on");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* GSAP/Three.js só ligam se o navegador estiver exibindo frames de verdade —
     abas em segundo plano e webviews congeladas não disparam rAF, e sem isso
     o conteúdo ficaria travado invisível no estado inicial das animações. */
  let rafOk = false;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      rafOk = true;
      if (!reduced) initFX();
    }),
  );
  setTimeout(() => {
    if (!rafOk)
      document
        .querySelectorAll(".reveal")
        .forEach((el) => el.classList.add("on"));
  }, 700);

  function initFX() {
    /* ===== GSAP: entrada do hero, badges flutuantes, parallax e contadores ===== */
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      gsap.from(
        ".hero .eyebrow, .hero h1, .hero .lead, .hero-ctas, .hero-note",
        {
          y: 32,
          opacity: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
        },
      );
      gsap.from(".hero-card", {
        y: 70,
        opacity: 0,
        rotate: 5,
        duration: 1.1,
        ease: "power3.out",
        delay: 0.25,
      });
      gsap.from(".float-badge", {
        scale: 0,
        opacity: 0,
        duration: 0.7,
        stagger: 0.18,
        delay: 0.85,
        ease: "back.out(1.8)",
      });
      gsap.to(".fb-1", {
        y: -10,
        duration: 2.4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".fb-2", {
        y: 10,
        duration: 2.9,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });

      gsap.to(".hero-visual", {
        y: 70,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      document.querySelectorAll(".proof-item .num").forEach((el) => {
        const original = el.textContent.trim();
        const m = original.match(/^([\d.]+)(.*)$/);
        if (!m) return;
        const end = parseFloat(m[1]),
          suffix = m[2],
          decimals = m[1].includes(".") ? 1 : 0;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => {
            el.textContent = obj.v.toFixed(decimals) + suffix;
          },
          onComplete: () => {
            el.textContent = original;
          },
        });
      });
    }

    /* ===== Three.js: partículas quentes flutuando ===== */
    function particles(canvas, palette, opacity, size) {
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 60);
      camera.position.z = 9;

      const N = 130;
      const pos = new Float32Array(N * 3),
        col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 24;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
        const c = palette[Math.floor(Math.random() * palette.length)];
        col[i * 3] = c[0];
        col[i * 3 + 1] = c[1];
        col[i * 3 + 2] = c[2];
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

      const cv = document.createElement("canvas");
      cv.width = cv.height = 64;
      const ctx = cv.getContext("2d");
      const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.5, "rgba(255,255,255,.45)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 64, 64);

      const points = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          size,
          map: new THREE.CanvasTexture(cv),
          vertexColors: true,
          transparent: true,
          opacity,
          depthWrite: false,
        }),
      );
      scene.add(points);

      let mx = 0,
        my = 0,
        visible = true;
      window.addEventListener(
        "pointermove",
        (e) => {
          mx = e.clientX / innerWidth - 0.5;
          my = e.clientY / innerHeight - 0.5;
        },
        { passive: true },
      );
      new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(
        canvas,
      );

      function resize() {
        const w = canvas.clientWidth,
          h = canvas.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener("resize", resize);

      const clock = new THREE.Clock();
      (function loop() {
        requestAnimationFrame(loop);
        if (!visible || window.__fxPaused) return;
        const t = clock.getElapsedTime();
        points.rotation.y = t * 0.03;
        points.position.y = Math.sin(t * 0.4) * 0.3;
        camera.position.x += (mx * 1.2 - camera.position.x) * 0.04;
        camera.position.y += (-my * 0.8 - camera.position.y) * 0.04;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      })();
    }

    if (typeof THREE !== "undefined") {
      try {
        const gold = [201 / 255, 154 / 255, 63 / 255];
        const terracotta = [196 / 255, 87 / 255, 58 / 255];
        const coffee = [139 / 255, 94 / 255, 52 / 255];
        const cream = [250 / 255, 245 / 255, 236 / 255];
        particles(
          document.getElementById("fx-hero"),
          [gold, terracotta, coffee],
          0.45,
          0.32,
        );
        particles(document.getElementById("fx-final"), [gold, cream], 0.7, 0.3);
      } catch (e) {
        console.warn("Partículas 3D desativadas:", e);
      }
    }
  } /* fim initFX */
})();
