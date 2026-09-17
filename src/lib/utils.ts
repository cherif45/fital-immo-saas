export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 FCFA';
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
}

export function formatNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Math.round(amount).toLocaleString('fr-FR');
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Convert number to French words for official rent receipts and legal documents
 */
export function nombreEnLettres(nombre: number): string {
  if (nombre === 0) return 'zéro franc CFA';
  
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  const particuliers = {
    11: 'onze', 12: 'douze', 13: 'treize', 14: 'quatorze', 15: 'quinze', 16: 'seize',
    71: 'soixante-onze', 72: 'soixante-douze', 73: 'soixante-treize', 74: 'soixante-quatorze',
    75: 'soixante-quinze', 76: 'soixante-seize', 91: 'quatre-vingt-onze', 92: 'quatre-vingt-douze',
    93: 'quatre-vingt-treize', 94: 'quatre-vingt-quatorze', 95: 'quatre-vingt-quinze', 96: 'quatre-vingt-seize'
  };

  function convertirCentaines(n: number): string {
    let resultat = '';
    const c = Math.floor(n / 100);
    const r = n % 100;

    if (c > 0) {
      if (c === 1) {
        resultat += 'cent ';
      } else {
        resultat += unites[c] + ' cent' + (r === 0 ? 's ' : ' ');
      }
    }

    if (r > 0) {
      if (particuliers[r as keyof typeof particuliers]) {
        resultat += particuliers[r as keyof typeof particuliers] + ' ';
      } else {
        const d = Math.floor(r / 10);
        const u = r % 10;

        if (d === 8 && u === 0) {
          resultat += 'quatre-vingts ';
        } else if (d > 0) {
          resultat += dizaines[d];
          if (u === 1 && d !== 8) {
            resultat += ' et un ';
          } else if (u > 0) {
            resultat += '-' + unites[u] + ' ';
          } else {
            resultat += ' ';
          }
        } else if (u > 0) {
          resultat += unites[u] + ' ';
        }
      }
    }

    return resultat.trim();
  }

  const millions = Math.floor(nombre / 1000000);
  const milliers = Math.floor((nombre % 1000000) / 1000);
  const reste = nombre % 1000;

  let texte = '';

  if (millions > 0) {
    texte += (millions === 1 ? 'un million ' : convertirCentaines(millions) + ' millions ');
  }

  if (milliers > 0) {
    texte += (milliers === 1 ? 'mille ' : convertirCentaines(milliers) + ' mille ');
  }

  if (reste > 0) {
    texte += convertirCentaines(reste);
  }

  return (texte.trim() + ' francs CFA').replace(/\s+/g, ' ');
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return Promise.resolve(true);
  } catch {
    document.body.removeChild(textArea);
    return Promise.resolve(false);
  }
}

export function exportToCSV(filename: string, rows: (string | number)[][], headers: string[]) {
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToCsv(filename: string, headers: string[], data: (string | number)[][]) {
  exportToCSV(filename, data, headers);
}

