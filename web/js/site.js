/* ==========================================================================
   LINEUP LAB · 站点交互脚本（原生 JS，无依赖）
   1) 顶部导航开关  2) 角色立绘竖排切换 + 背景/主题色变化  3) 滚动出现动画
   4) 角色速查筛选  5) 回到顶部  6) 键盘左右切换
   ========================================================================== */
(function () {
  "use strict";

  var docEl = document.documentElement;

  /* ---------- 1. 移动端导航 ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") nav.classList.remove("is-open");
    });
  }

  /* ---------- 2. 角色切换 ---------- */
  function initLineup() {
    var lineup = document.querySelector(".lineup");
    if (!lineup) return;

    var rail = lineup.querySelector(".rail");
    var items = Array.prototype.slice.call(lineup.querySelectorAll(".rail__item"));
    var panels = Array.prototype.slice.call(lineup.querySelectorAll(".panel"));
    var layers = Array.prototype.slice.call(lineup.querySelectorAll(".agent-bg__layer"));
    if (!items.length) return;

    var layerIndex = 0;
    var current = -1;

    function paintBackground(bgUrl) {
      if (!layers.length || !bgUrl) return;
      var next = layers[(layerIndex + 1) % layers.length];
      next.style.backgroundImage = 'url("' + bgUrl + '")';
      // 强制回流，确保过渡生效
      void next.offsetWidth;
      layers[layerIndex].classList.remove("is-on");
      next.classList.add("is-on");
      layerIndex = (layerIndex + 1) % layers.length;
    }

    function activate(index, useHash) {
      if (index < 0 || index >= items.length) index = 0;
      if (index === current) return;
      current = index;

      items.forEach(function (it, i) {
        var on = i === index;
        it.classList.toggle("is-active", on);
        it.setAttribute("aria-selected", on ? "true" : "false");
        it.setAttribute("tabindex", on ? "0" : "-1");
      });

      var target = items[index].getAttribute("data-target");
      panels.forEach(function (p) {
        p.classList.toggle("is-active", "#" + p.id === target);
      });

      var accent = items[index].getAttribute("data-accent");
      if (accent) {
        lineup.style.setProperty("--accent", accent);
        lineup.style.setProperty("--accent-soft", hexToRgba(accent, 0.14));
      }
      paintBackground(items[index].getAttribute("data-bg"));

      var panel = lineup.querySelector(target);
      if (panel) {
        // 重新触发入场动画
        panel.style.animation = "none";
        void panel.offsetWidth;
        panel.style.animation = "";
        // 移动端点选后滚动到内容顶部
        if (window.innerWidth < 861 && useHash !== "silent") {
          var top = panel.getBoundingClientRect().top + window.pageYOffset - 84;
          window.scrollTo({ top: top, behavior: "smooth" });
        }
      }

      var slug = items[index].getAttribute("data-slug");
      if (slug && useHash && useHash !== "silent") {
        try {
          history.replaceState(null, "", "#" + slug);
        } catch (err) {
          /* file:// 下可能受限，忽略 */
        }
      }
    }

    function hexToRgba(hex, a) {
      var h = hex.replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    items.forEach(function (item, i) {
      item.addEventListener("click", function () {
        activate(i, true);
      });
      item.addEventListener("mouseenter", function () {
        // 悬停微预览背景，不改变激活状态
        if (window.innerWidth > 860) {
          var bg = item.getAttribute("data-bg");
          if (bg) item.style.setProperty("--peek", 'url("' + bg + '")');
        }
      });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(i, true);
        }
      });
    });

    // 键盘左右 / 上下切换
    document.addEventListener("keydown", function (e) {
      if (!lineup) return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      var isHorizontal = window.innerWidth < 861;
      if ((isHorizontal && e.key === "ArrowRight") || (!isHorizontal && e.key === "ArrowDown")) {
        if (current >= 0) {
          e.preventDefault();
          activate(Math.min(items.length - 1, current + 1), true);
        }
      }
      if ((isHorizontal && e.key === "ArrowLeft") || (!isHorizontal && e.key === "ArrowUp")) {
        if (current >= 0) {
          e.preventDefault();
          activate(Math.max(0, current - 1), true);
        }
      }
    });

    // 初始：优先 hash 指定的角色，否则第一个
    var initial = 0;
    if (location.hash.length > 1) {
      var want = location.hash.slice(1);
      items.forEach(function (it, i) {
        if (it.getAttribute("data-slug") === want) initial = i;
      });
    }
    activate(initial, "silent");
  }

  /* ---------- 3. 滚动出现动画 ---------- */
  function initReveal() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!nodes.length) return;

    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) {
        n.classList.add("is-in");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    nodes.forEach(function (n) {
      io.observe(n);
    });
  }

  /* ---------- 4. 角色速查筛选 ---------- */
  function initFilters() {
    var bar = document.querySelector(".filters");
    if (!bar) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll(".agent-card"));
    var buttons = Array.prototype.slice.call(bar.querySelectorAll(".filter-btn"));
    var empty = document.querySelector(".filter-empty");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          b.classList.toggle("is-on", b === btn);
        });
        var role = btn.getAttribute("data-role");
        var shown = 0;
        cards.forEach(function (card) {
          var ok = role === "all" || card.getAttribute("data-role") === role;
          card.style.display = ok ? "" : "none";
          if (ok) shown++;
        });
        if (empty) empty.style.display = shown ? "none" : "block";
      });
    });
  }

  /* ---------- 5. 回到顶部 ---------- */
  function initToTop() {
    var btn = document.querySelector(".to-top");
    if (!btn) return;
    function onScroll() {
      btn.classList.toggle("is-on", window.pageYOffset > 520);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 6. 导航当前页高亮 ---------- */
  function initActiveNav() {
    var path = location.pathname.split("/").pop() || "index.html";
    if (!path || path === "") path = "index.html";
    document.querySelectorAll(".nav a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("/").pop();
      if (href && href === path) a.classList.add("is-active");
    });
  }

  function boot() {
    initNav();
    initLineup();
    initReveal();
    initFilters();
    initToTop();
    initActiveNav();
  }

  if (docEl.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
