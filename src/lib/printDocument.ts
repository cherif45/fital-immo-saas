export interface FitToPagesOptions {
  pageIds: string[];
  baseFontPx: number;
  minFontPx: number;
  pageBudgetMm: number;
  cssVar?: string;
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

  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((el) => {
      const href = (el as HTMLLinkElement).getAttribute("href");
      if (!href) return "";

      try {
        return `<link rel="stylesheet" href="${
          new URL(href, window.location.href).href
        }">`;
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("\n");

  const inlineStyles = Array.from(document.querySelectorAll("style"))
    .map((el) => el.outerHTML)
    .join("\n");

  const printOverrides = sourceId === "printable-quittance" ? `
    @page {
      size: A4 portrait;
      margin: 4mm 5mm;
    }

    * {
      box-sizing: border-box !important;
    }

    html,
    body {
      width: 200mm !important;
      height: 289mm !important;
      min-height: 0 !important;
      max-height: 289mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: #fff !important;
    }

    body {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* DOCUMENT */
    #${sourceId} {
      width: 200mm !important;
      max-width: 200mm !important;
      height: 287mm !important;
      min-height: 0 !important;
      max-height: 287mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      page-break-before: avoid !important;
      page-break-after: avoid !important;
      break-before: avoid !important;
      break-after: avoid !important;
    }

    /* COPIE 1 : conserver sa hauteur naturelle */
    #${sourceId} > #quittance-copy-1 {
      display: block !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 1mm !important;
      overflow: visible !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* Remonter légèrement ENCAISSÉ PAR */
    #${sourceId} > #quittance-copy-1 .receipt-signature-row {
      margin-top: 0 !important;
      position: static !important;
      overflow: visible !important;
    }

    #${sourceId} > #quittance-copy-1 .user-signature-block {
      margin-top: 0 !important;
      position: static !important;
    }

    /* Remonter légèrement NOTA */
    #${sourceId} > #quittance-copy-1 .nota-box {
      margin-top: 0 !important;
      padding-top: 0.5mm !important;
      position: static !important;
    }

    /* LIGNE DE DÉCOUPE */
    #${sourceId} > .cut-line {
      display: block !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      height: 1px !important;
      min-height: 1px !important;
      margin: 1.5mm 0 !important;
      padding: 0 !important;
      border-top: 1px dashed #777 !important;
      overflow: visible !important;
    }

    /* COPIE 2 : hauteur naturelle, aucun écrasement */
    #${sourceId} > #quittance-copy-2 {
      display: block !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 1mm !important;
      overflow: visible !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    /* Signature copie 2 */
    #${sourceId} > #quittance-copy-2 .receipt-signature-row {
      margin-top: 0 !important;
      position: static !important;
      overflow: visible !important;
    }

    #${sourceId} > #quittance-copy-2 .user-signature-block {
      margin-top: 0 !important;
      position: static !important;
    }

    /* NOTA copie 2 : ne plus le pousser hors de la page */
    #${sourceId} > #quittance-copy-2 .nota-box {
      display: block !important;
      margin-top: 0 !important;
      padding-top: 0.5mm !important;
      position: static !important;
      flex-shrink: 0 !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    #${sourceId} > #quittance-copy-2 .quittance-foot,
    #${sourceId} > #quittance-copy-2 .copy-label {
      flex-shrink: 0 !important;
    }

    /* SIGNATURE ET CACHEt */
    #${sourceId} .user-signature-block {
      display: flex !important;
      position: relative !important;
      z-index: 2 !important;
      background: #fff !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
    }

    #${sourceId} .quittance-signature-container {
      flex-shrink: 0 !important;
      position: relative !important;
    }

    #${sourceId} .quittance-signature-zone {
      height: auto !important;
      min-height: 88px !important;
      max-height: 132px !important;
      position: relative !important;
      overflow: visible !important;
    }

    #${sourceId} img.quittance-signature-image {
      display: block !important;
      width: auto !important;
      height: auto !important;
      max-height: 108px !important;
      max-width: 100% !important;
      object-fit: contain !important;
    }

    #${sourceId} img.quittance-cachet-image {
      display: block !important;
      width: auto !important;
      height: auto !important;
      max-height: 56px !important;
      max-width: 90% !important;
      object-fit: contain !important;
    }

    /* NOTA : conserver toutes les lignes */
    #${sourceId} .nota-box,
    #${sourceId} .nota-box > div {
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      overflow: visible !important;
      white-space: normal !important;
      font-size: 6px !important;
      line-height: 1.15 !important;
    }

    #${sourceId} .nota-box .pl-3 {
      padding-left: 3mm !important;
    }

    /* Masquer les commandes */
    button,
    .print\\:hidden {
      display: none !important;
    }

    img {
      max-width: 100% !important;
    }
  ` : "";
  win.document.write(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>` +
      `<base href="${window.location.origin}/">` +
      `<title>${title.replace(/</g, "&lt;")}</title>` +
      `${links}${inlineStyles}<style>` +
      extraCss +
      printOverrides +
      `</style></head><body>${source.outerHTML}</body></html>`,
  );

  win.document.close();
  win.focus();

  let printed = false;

  const doPrint = async () => {
    if (printed) return;

    try {
      if (win.document.fonts?.ready) {
        await win.document.fonts.ready;
      }

      await Promise.all(
        Array.from(win.document.images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }

              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
      );

      if (printed) return;

      if (fitToPages) {
        const doc = win.document;
        const container = doc.getElementById(sourceId);
        const cssVar = fitToPages.cssVar || "--printfs";

        let size = fitToPages.baseFontPx;

        const apply = (value: number) => {
          container?.style.setProperty(cssVar, `${value}px`);
          void container?.offsetHeight;
        };

        const fits = () =>
          fitToPages.pageIds.every((id) => {
            const el = doc.getElementById(id);
            if (!el) return true;

            return (
              el.scrollHeight <= fitToPages.pageBudgetMm * 3.7795275591 + 2
            );
          });

        apply(size);

        let guard = 0;

        while (!fits() && size > fitToPages.minFontPx && guard++ < 20) {
          size = Math.max(fitToPages.minFontPx, size - 0.5);
          apply(size);
        }

        fitToPages.finalize?.(win);
      }

      printed = true;
      win.print();
    } catch {
      // La fenêtre reste ouverte pour impression manuelle.
    }
  };

  if (win.document.readyState === "complete") {
    window.setTimeout(() => void doPrint(), 500);
  } else {
    win.addEventListener(
      "load",
      () => window.setTimeout(() => void doPrint(), 500),
      { once: true },
    );
  }

  window.setTimeout(() => void doPrint(), 5000);
}
