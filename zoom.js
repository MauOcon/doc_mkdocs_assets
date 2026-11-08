/* Zoom a demanda para diagramas Mermaid.
 *
 * Mermaid (cargado como ES module con startOnLoad) renderiza los <pre class="mermaid">
 * de forma asíncrona y reemplaza su contenido por un <svg>. Para no competir con
 * ese ciclo de render, este script:
 *   1. Usa delegación de eventos: un único listener de clic en document detecta
 *      clics dentro de cualquier .mermaid ya renderizado y abre el overlay.
 *   2. Añade un botón "Ampliar" a cada diagrama de forma idempotente, reintentando
 *      por un tiempo hasta que Mermaid haya insertado el <svg>.
 *   3. Al abrir, clona el <svg> válido (conservando su id, porque los <style>
 *      internos de Mermaid dependen de él) y lo muestra en el overlay.
 *
 * Compatible con la navegación instantánea de Material (document$).
 */
(function () {
  "use strict";

  var overlay, stage, cerrarOverlay, resetOverlay;

  // --- Overlay único reutilizable -----------------------------------------
  function asegurarOverlay() {
    if (overlay) {
      return;
    }

    overlay = document.createElement("div");
    overlay.className = "diagram-overlay";

    stage = document.createElement("div");
    stage.className = "diagram-stage";
    overlay.appendChild(stage);

    var controls = document.createElement("div");
    controls.className = "diagram-overlay-controls";

    var btnMas = crearBoton("+", "Acercar");
    var btnMenos = crearBoton("\u2212", "Alejar");
    var btnReset = crearBoton("\u21BA", "Restablecer");
    var btnCerrar = crearBoton("\u2715", "Cerrar");

    controls.appendChild(btnMas);
    controls.appendChild(btnMenos);
    controls.appendChild(btnReset);
    controls.appendChild(btnCerrar);
    overlay.appendChild(controls);

    var hint = document.createElement("div");
    hint.className = "diagram-overlay-hint";
    hint.textContent = "Rueda para zoom \u00B7 arrastra para mover \u00B7 Esc para cerrar";
    overlay.appendChild(hint);

    document.body.appendChild(overlay);

    var escala = 1;
    var tx = 0;
    var ty = 0;
    var arrastrando = false;
    var inicioX = 0;
    var inicioY = 0;

    function aplicar() {
      stage.style.transform =
        "translate(" + tx + "px," + ty + "px) scale(" + escala + ")";
    }

    function reset() {
      escala = 1;
      tx = 0;
      ty = 0;
      aplicar();
    }

    function cerrar() {
      overlay.classList.remove("is-open");
      stage.innerHTML = "";
      reset();
    }

    cerrarOverlay = cerrar;
    resetOverlay = reset;

    btnMas.addEventListener("click", function (e) {
      e.stopPropagation();
      escala = Math.min(escala * 1.25, 8);
      aplicar();
    });
    btnMenos.addEventListener("click", function (e) {
      e.stopPropagation();
      escala = Math.max(escala / 1.25, 0.2);
      aplicar();
    });
    btnReset.addEventListener("click", function (e) {
      e.stopPropagation();
      reset();
    });
    btnCerrar.addEventListener("click", function (e) {
      e.stopPropagation();
      cerrar();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        cerrar();
      }
    });

    overlay.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        var factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        escala = Math.min(Math.max(escala * factor, 0.2), 8);
        aplicar();
      },
      { passive: false }
    );

    stage.addEventListener("mousedown", function (e) {
      arrastrando = true;
      inicioX = e.clientX - tx;
      inicioY = e.clientY - ty;
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!arrastrando) {
        return;
      }
      tx = e.clientX - inicioX;
      ty = e.clientY - inicioY;
      aplicar();
    });
    window.addEventListener("mouseup", function () {
      arrastrando = false;
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        cerrar();
      }
    });
  }

  function crearBoton(texto, titulo) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = texto;
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    return b;
  }

  function esSvgDeError(svg) {
    if (!svg) {
      return true;
    }
    // Mermaid marca ÚNICAMENTE el diagrama de error con
    // aria-roledescription="error". Los diagramas válidos usan otros valores
    // (p. ej. "flowchart-v2", "sequence"), así que no deben descartarse.
    return svg.getAttribute("aria-roledescription") === "error";
  }

  function svgValido(mermaid) {
    if (!mermaid) {
      return null;
    }
    var svgs = mermaid.querySelectorAll("svg");
    for (var i = 0; i < svgs.length; i++) {
      if (!esSvgDeError(svgs[i])) {
        return svgs[i];
      }
    }
    return null;
  }

  function abrirDesde(mermaid) {
    var svg = svgValido(mermaid);
    if (!svg) {
      return;
    }
    asegurarOverlay();
    resetOverlay();

    // Se clona el SVG válido. IMPORTANTE: se conserva el atributo id, porque
    // los <style> internos de Mermaid usan selectores basados en ese id
    // (#mermaid-xxx ...); si se quita, el SVG pierde colores.
    var clon = svg.cloneNode(true);

    // Dimensiones naturales del diagrama a partir del viewBox (vectoriales).
    var vb = (clon.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    var anchoNat = vb.length === 4 && vb[2] ? vb[2] : null;
    var altoNat = vb.length === 4 && vb[3] ? vb[3] : null;

    // Si no hay viewBox, se intenta derivar del bounding box del original.
    if (!anchoNat) {
      try {
        var bb = svg.getBBox();
        if (bb && bb.width) {
          anchoNat = bb.width;
          altoNat = bb.height;
          clon.setAttribute("viewBox", "0 0 " + bb.width + " " + bb.height);
        }
      } catch (e) {
        /* sin viewBox ni bbox: se deja tal cual */
      }
    }

    clon.removeAttribute("width");
    clon.removeAttribute("height");
    clon.style.maxWidth = "none";
    clon.style.maxHeight = "none";
    clon.setAttribute("preserveAspectRatio", "xMidYMid meet");

    if (anchoNat && altoNat) {
      // Se renderiza a un tamaño base GRANDE respetando la proporción: se
      // escala el diagrama para llenar el viewport (90%) por su lado dominante.
      // Así el render base es de alta resolución y el zoom parte de ahí, sin
      // estirar un bitmap pequeño (que era lo que lo hacía borroso).
      var escalaBase = Math.min(
        (window.innerWidth * 0.9) / anchoNat,
        (window.innerHeight * 0.9) / altoNat
      );
      // No se reduce por debajo de 1: si el diagrama es pequeño, se muestra a
      // tamaño natural (o mayor) para que se vea nítido y legible.
      escalaBase = Math.max(escalaBase, 1);
      clon.style.width = anchoNat * escalaBase + "px";
      clon.style.height = altoNat * escalaBase + "px";
    } else {
      clon.style.width = "90vw";
      clon.style.height = "auto";
    }

    stage.innerHTML = "";
    stage.appendChild(clon);
    overlay.classList.add("is-open");
  }

  // --- Botón "Ampliar" por diagrama (idempotente) -------------------------
  function marcarDiagramas() {
    var diagramas = document.querySelectorAll(".mermaid");
    diagramas.forEach(function (mermaid) {
      // Solo cuando ya hay <svg> válido y aún no tiene botón.
      var svg = mermaid.querySelector("svg");
      if (!svg || esSvgDeError(svg) || mermaid.querySelector(".diagram-zoom-btn")) {
        return;
      }
      mermaid.classList.add("diagram-wrapper");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "diagram-zoom-btn";
      btn.textContent = "\u26F6 Ampliar";
      btn.title = "Ver el diagrama en grande";
      btn.setAttribute("aria-label", "Ampliar diagrama");
      mermaid.appendChild(btn);
    });
  }

  // --- Delegación de eventos: funciona aunque Mermaid reemplace nodos ------
  function instalarDelegacion() {
    if (document.body.dataset.zoomDelegado === "1") {
      return;
    }
    document.body.dataset.zoomDelegado = "1";
    document.addEventListener("click", function (e) {
      var mermaid = e.target.closest ? e.target.closest(".mermaid") : null;
      if (!mermaid) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      abrirDesde(mermaid);
    });
  }

  function iniciar() {
    marcarDiagramas();
    // Mermaid renderiza después; reintentamos marcar por unos segundos.
    var intentos = 0;
    var timer = setInterval(function () {
      marcarDiagramas();
      intentos += 1;
      if (intentos > 20) {
        clearInterval(timer);
      }
    }, 300);
  }

  // La delegación se instala YA, sin depender de document$ ni del render de
  // Mermaid: así el clic funciona aunque document$ no emita en la carga inicial.
  instalarDelegacion();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  // Con navegación instantánea de Material: cerrar overlay y re-marcar al navegar.
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(function () {
      if (overlay) {
        cerrarOverlay();
      }
      iniciar();
    });
  }
})();
