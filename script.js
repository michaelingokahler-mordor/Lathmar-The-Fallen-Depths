/* Shared site behavior. */

function initialiseSiteMenu() {
  const siteMenu = document.querySelector(".site-menu");
  const menuToggle = document.querySelector(".menu-toggle");
  const menuPanel = document.querySelector(".menu-panel");

  menuToggle.addEventListener("click", () => {
    const isOpen = siteMenu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  menuPanel.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      siteMenu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

if (typeof codexEntries !== "undefined") {
    const codexList = document.querySelector("[data-codex-list]");
    const codexDetail = document.querySelector("[data-codex-detail]");
    const codexDetailCards = Array.from(document.querySelectorAll("[data-codex-detail-card]"));
    const codexTabs = document.querySelectorAll("[data-codex-tab]");
    let activeCodexTab = "races";
    let activeCodexDetailCard = 0;
    let codexDetailTransitionTimer;
    let codexListTransitionTimer;
    let codexDepthPortrait;
    const initialCodexEntry = codexEntries.races[0];
    codexDetailCards[0].style.setProperty(
      "--codex-art",
      `url("${codexArtworkPath}${initialCodexEntry.artwork.filename}")`
    );
    let activeCodexEntry = initialCodexEntry;

    function renderCodexDetail(entry, delay = 90) {
      activeCodexEntry = entry;
      window.clearTimeout(codexDetailTransitionTimer);
      codexDetailTransitionTimer = window.setTimeout(() => {
        const currentCard = codexDetailCards[activeCodexDetailCard];
        const nextCardIndex = activeCodexDetailCard === 0 ? 1 : 0;
        const nextCard = codexDetailCards[nextCardIndex];

        nextCard.style.setProperty("--codex-art", `url("${codexArtworkPath}${entry.artwork.filename}")`);
        nextCard.classList.remove("is-depth-enhanced");
        nextCard.innerHTML = `
          <p class="codex-detail__type">${activeCodexTab === "races" ? "Race" : entry.group + " Guild"}</p>
          <h3>${entry.name}</h3>
          <p>${entry.text}</p>
          <div class="codex-tags" aria-label="${entry.name} traits">
            ${entry.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
        `;
        nextCard.setAttribute("aria-hidden", "false");
        currentCard.setAttribute("aria-hidden", "true");
        currentCard.classList.remove("is-visible");
        void nextCard.offsetWidth;
        nextCard.classList.add("is-visible");
        codexDepthPortrait?.show(entry.name, nextCard);
        activeCodexDetailCard = nextCardIndex;
      }, delay);
    }

    function renderCodexList({ animate = false } = {}) {
      const entries = codexEntries[activeCodexTab];
      const renderEntries = () => {
        codexList.innerHTML = entries.map((entry, index) => {
          const group = entry.group ? `<span>${entry.group}</span>` : "";
          const cardStyle = `--codex-card-index: ${index}; --codex-card-position: ${entry.artwork.position}; --codex-card-scale: ${entry.artwork.scale};`;
          return `
            <button class="codex-choice${index === 0 ? " is-active" : ""}" type="button" data-codex-index="${index}" aria-pressed="${index === 0}" style="${cardStyle}">
              <img src="${codexArtworkPath}${entry.artwork.filename}" alt="" />
              ${group}
              <strong>${entry.name}</strong>
            </button>
          `;
        }).join("");

        if (animate) {
          window.requestAnimationFrame(() => codexList.classList.remove("is-changing"));
        }
      };

      window.clearTimeout(codexListTransitionTimer);
      if (animate) {
        codexList.classList.add("is-changing");
        codexListTransitionTimer = window.setTimeout(renderEntries, 120);
      } else {
        renderEntries();
      }

      renderCodexDetail(entries[0], animate ? 120 : 90);
    }

    codexTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        activeCodexTab = tab.dataset.codexTab;
        codexTabs.forEach((item) => {
          const isActive = item === tab;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", String(isActive));
        });
        renderCodexList({ animate: true });
      });
    });

    codexList.addEventListener("click", (event) => {
      const choice = event.target.closest("[data-codex-index]");
      if (!choice) {
        return;
      }
      codexList.querySelectorAll(".codex-choice").forEach((item) => {
        item.classList.toggle("is-active", item === choice);
        item.setAttribute("aria-pressed", String(item === choice));
      });
      renderCodexDetail(codexEntries[activeCodexTab][Number(choice.dataset.codexIndex)]);
    });

    renderCodexList();

    function initialiseCodexDepthPortraits() {
      const stage = document.querySelector("[data-codex-depth-stage]");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

      if (!stage || reducedMotion.matches || !finePointer.matches || !window.PIXI) {
        return;
      }

      const artworkEntries = Object.values(codexEntries).flat();
      Promise.all(artworkEntries.map(async (entry) => {
        return [entry.name, await PIXI.Assets.load(`${codexArtworkDepthmapPath}${entry.artwork.filename}`)];
      }))
        .then((depthTexturePairs) => {
          const depthTextures = Object.fromEntries(depthTexturePairs);
          const app = new PIXI.Application({
            autoDensity: true,
            resolution: 1,
            backgroundAlpha: 0,
            antialias: true
          });
          stage.appendChild(app.view);

          const createFogLayer = (name) => {
            const fogLayer = new PIXI.Sprite(PIXI.Texture.WHITE);
            const filter = new PIXI.Filter(undefined, `
              precision highp float;
              varying vec2 vTextureCoord;
              uniform sampler2D depthMap;
              uniform vec2 depthUvScale;
              uniform vec2 depthUvOffset;
              uniform vec2 fogOffset;

              float hash(vec2 point) {
                return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
              }

              float noise(vec2 point) {
                vec2 cell = floor(point);
                vec2 local = fract(point);
                local = local * local * (3.0 - 2.0 * local);
                return mix(
                  mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
                  mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x),
                  local.y
                );
              }

              float fogNoise(vec2 point) {
                float value = 0.0;
                value += noise(point) * 0.55;
                value += noise(point * 2.1 + 13.7) * 0.28;
                value += noise(point * 4.2 + 29.1) * 0.17;
                return value;
              }

              void main(void) {
                vec2 depthUv = vTextureCoord * depthUvScale + depthUvOffset;
                float actorDepth = texture2D(depthMap, depthUv).r;
                float farBackgroundMask = 1.0 - smoothstep(0.01, 0.04, actorDepth);
                float fogDensity = fogNoise(vTextureCoord * vec2(4.2, 6.5) + fogOffset);
                float smoke = smoothstep(0.50, 0.70, fogDensity);
                float fogAlpha = farBackgroundMask * smoke * 0.60;
                gl_FragColor = vec4(vec3(0.64, 0.70, 0.68) * fogAlpha, fogAlpha);
              }
            `, {
              depthMap: depthTextures[name],
              depthUvScale: [1, 1],
              depthUvOffset: [0, 0],
              fogOffset: [0, 0]
            });
            fogLayer.filters = [filter];
            fogLayer.name = name;
            return fogLayer;
          };

          const resizeFogLayer = (fogLayer, bounds) => {
            fogLayer.width = bounds.width;
            fogLayer.height = bounds.height;
            const imageAspect = fogLayer.filters[0].uniforms.depthMap.width / fogLayer.filters[0].uniforms.depthMap.height;
            const stageAspect = bounds.width / bounds.height;
            let uvScale = [1, 1];
            let uvOffset = [0, 0];
            if (stageAspect > imageAspect) {
              uvScale[1] = imageAspect / stageAspect;
              uvOffset[1] = (1 - uvScale[1]) / 2;
            } else {
              uvScale[0] = stageAspect / imageAspect;
              uvOffset[0] = (1 - uvScale[0]) / 2;
            }
            fogLayer.filters[0].uniforms.depthUvScale = uvScale;
            fogLayer.filters[0].uniforms.depthUvOffset = uvOffset;
          };
          const resizeFogLayers = () => {
            const bounds = stage.getBoundingClientRect();
            if (!bounds.width || !bounds.height) {
              return;
            }
            app.renderer.resize(bounds.width, bounds.height);
            app.stage.children.forEach((fogLayer) => resizeFogLayer(fogLayer, bounds));
          };
          new ResizeObserver(resizeFogLayers).observe(stage);

          let visibleFogLayer;
          let fogTransitionFrame;
          const showFogLayer = (name, card) => {
            if (visibleFogLayer?.name === name) {
              card.appendChild(stage);
              return;
            }
            window.cancelAnimationFrame(fogTransitionFrame);
            app.stage.children
              .filter((fogLayer) => fogLayer !== visibleFogLayer)
              .forEach((fogLayer) => {
                app.stage.removeChild(fogLayer);
                fogLayer.destroy({ children: true, texture: false, baseTexture: false });
              });
            if (visibleFogLayer) {
              visibleFogLayer.alpha = 1;
            }
            const previousFogLayer = visibleFogLayer;
            const nextFogLayer = createFogLayer(name);
            nextFogLayer.alpha = previousFogLayer ? 0 : 1;
            app.stage.addChild(nextFogLayer);
            visibleFogLayer = nextFogLayer;
            card.appendChild(stage);
            resizeFogLayers();

            if (!previousFogLayer) {
              return;
            }
            const transitionStart = performance.now();
            const transitionDuration = 260;
            const fadeFogLayer = (now) => {
              const progress = Math.min(1, (now - transitionStart) / transitionDuration);
              previousFogLayer.alpha = 1 - progress;
              nextFogLayer.alpha = progress;
              if (progress < 1) {
                fogTransitionFrame = window.requestAnimationFrame(fadeFogLayer);
                return;
              }
              app.stage.removeChild(previousFogLayer);
              previousFogLayer.destroy({ children: true, texture: false, baseTexture: false });
            };
            fogTransitionFrame = window.requestAnimationFrame(fadeFogLayer);
          };

          let isVisible = true;

          new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
          }, { threshold: 0.1 }).observe(codexDetail);

          app.ticker.add(() => {
            if (!isVisible || document.hidden) {
              return;
            }
            const fogTime = performance.now() / 1000;
            const fogOffset = [fogTime * 0.120, Math.sin(fogTime * 0.32) * 0.12];
            app.stage.children.forEach((fogLayer) => {
              fogLayer.filters[0].uniforms.fogOffset = fogOffset;
            });
          });

          codexDepthPortrait = { show: showFogLayer };
          showFogLayer(activeCodexEntry.name, document.querySelector("[data-codex-detail-card].is-visible"));
          stage.classList.remove("is-ready");
          void stage.offsetWidth;
          window.setTimeout(() => stage.classList.add("is-ready"), 80);
        })
        .catch(() => {
          // Keep the existing CSS background when the renderer or either texture cannot load.
        });
    }

    window.addEventListener("load", initialiseCodexDepthPortraits, { once: true });

    /* scroll the full screen sections */
    const hero = document.querySelector(".hero");
    const page = document.querySelector(".page");
    const codexSection = document.querySelector(".codex-section");
    const snapSections = [hero, page, codexSection];
    let scrollJumpLocked = false;
    function scrollToSection(target) {
      scrollJumpLocked = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        scrollJumpLocked = false;
      }, 750);
    }
    function scrollerHeroPage(e) {
      if (e.target.closest(".codex-list")) {
        return;
      }
      if (scrollJumpLocked || e.ctrlKey || e.deltaY === 0) {
        return;
      }
      const scrollTop = window.scrollY;
      const threshold = 8;
      const currentIndex = snapSections.findIndex((section, index) => {
        const nextSection = snapSections[index + 1];
        const sectionTop = section.offsetTop;
        const sectionBottom = nextSection ? nextSection.offsetTop : section.offsetTop + section.offsetHeight;
        return scrollTop >= sectionTop - threshold && scrollTop < sectionBottom - threshold;
      });
      if (currentIndex === -1) {
        return;
      }
      if (e.deltaY > 0 && currentIndex < snapSections.length - 1) {
        e.preventDefault();
        scrollToSection(snapSections[currentIndex + 1]);
        return;
      }
      if (e.deltaY < 0 && scrollTop <= snapSections[currentIndex].offsetTop + threshold && currentIndex > 0) {
        e.preventDefault();
        scrollToSection(snapSections[currentIndex - 1]);
      }
    }
    window.addEventListener("wheel", scrollerHeroPage, { passive: false });

    /* parallax effect on Lathmar logo */
    const heroContent = document.querySelector(".hero__title-logo");
    window.addEventListener("scroll", () => {
      const scrolled = window.scrollY;
      heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
    });
}

initialiseSiteMenu();
