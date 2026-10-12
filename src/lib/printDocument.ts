// ============================================================
// Impression isolée d'un document : clone le contenu ciblé dans
// une fenêtre dédiée avec son propre CSS (aucune dépendance au
// CSS de l'app : pas d'overlay sombre, pas de pages noires).
// ============================================================

export interface FitToPagesOptions {
  /** Ids des blocs dont chacun doit tenir sur UNE page A4 (ex. une page logique par bloc) */
  pageIds: string[];
  /** Taille de police de départ en px (réduite seulement si besoin) */
  baseFontPx: number;
  /** Taille minimale en px (on ne descend jamais en dessous) */
  minFontPx: number;
  /** Hauteur utile d'une page en mm (297 - marges haut+bas) */
  pageBudgetMm: number;
  /** Nom de la variable CSS pilotant la taille (définie sur le conteneur) */
  cssVar?: string;
  /** Retouche finale après ajustement (ex. plaquer un pied en bas), avant impression */
  finalize?: (win: Window) => void;
}

export function printElementById(
  sourceId: string,
  title: string,
  extraCss = "",
  fitToPages?: FitToPagesOptions,
): void {
  const source = document.getElementById(sourceId);
  if (!source) {
    window.print();
    return;
  }
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    window.print();
    return;
  }

  // Feuilles de style de l'app (URLs absolues pour la fenêtre vierge)
  const links = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]'),
  )
    .map((el) => {
      const href = (el as HTMLLinkElement).getAttribute("href");
      if (!href) return "";
      try {
        const abs = new URL(href, window.location.href).href;
        return `<link rel="stylesheet" href="${abs}">`;
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n");
  const inlineStyles = Array.from(document.querySelectorAll("style"))
    .map((el) => el.outerHTML)
    .join("\n");

  win.document.write(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>` +
      `<base href="${window.location.origin}/">` +
      `<title>${title.replace(/</g, "&lt;")}</title>` +
      `${links}${inlineStyles}<style>` +
      // Garde-fous : page blanche, contenu visible, pas de boutons
      `html,body{background:#ffffff !important;color:#000000 !important;margin:0 !important;padding:0 !important;}` +
      `body *{visibility:visible !important;}` +
      `button,.print\\:hidden{display:none !important;}` +
      `img{max-width:100% !important;}` +
      extraCss +
      // outerHTML (et non innerHTML) : le conteneur garde son id, sans
      // quoi les règles #id, la mesure et le plaquage en bas sont inopérants
      `</style></head><body>${source.outerHTML}</body></html>`,
  );
  win.document.close();
  win.focus();

  // Ajustement exact : chaque bloc pageIds doit tenir sur une page.
  // On mesure en conditions réelles d'impression puis on réduit la
  // police (via variable CSS) jusqu'à ce que tout tienne. Garantit
  // l'absence de page blanche / page en trop, quelles que soient
  // les données (noms longs, adresses longues, etc.).
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      if (fitToPages) {
        const doc = win.document;
        const container = doc.getElementById(sourceId) as HTMLElement | null;
        const cssVar = fitToPages.cssVar || "--printfs";
        const MM = 3.7795275591;
        const budgetPx = fitToPages.pageBudgetMm * MM;
        let size = fitToPages.baseFontPx;
        const apply = (s: number) => {
          container?.style.setProperty(cssVar, `${s}px`);
          // force le recalcul de mise en page avant mesure
          void container?.offsetHeight;
        };
        const fits = () =>
          fitToPages.pageIds.every((id) => {
            const el = doc.getElementById(id) as HTMLElement | null;
            return el ? el.offsetHeight <= budgetPx + 2 : true;
          });
        apply(size);
        let guard = 0;
        while (!fits() && size > fitToPages.minFontPx && guard++ < 20) {
          size -= 0.5;
          apply(size);
        }
        if (fitToPages.finalize) fitToPages.finalize(win);
      }
      win.print();
    } catch {
      /* aperçu déjà ouvert, l'utilisateur imprime manuellement */
    }
  };
  // Mesurer seulement quand les CSS sont chargées (sinon hauteurs fausses)
  try {
    if (win.document.readyState === "complete") {
      setTimeout(doPrint, 250);
    } else {
      win.addEventListener("load", () => setTimeout(doPrint, 250));
    }
  } catch {
    setTimeout(doPrint, 400);
  }
  setTimeout(doPrint, 2500);
}
