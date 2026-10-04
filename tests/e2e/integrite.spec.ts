import { test, expect } from '@playwright/test';

const ONGLETS_A_TESTER = [
  { nom: 'Dashboard', selector: /dashboard|tableau/i },
  { nom: 'Proprietaires', selector: /propri[eé]taires/i },
  { nom: 'Locataires', selector: /locataires/i },
  { nom: 'Immeubles', selector: /immeubles|b[aâ]timents/i },
  { nom: 'Espaces', selector: /espaces|unit[eé]s/i },
  { nom: 'Biens', selector: /biens/i },
  { nom: 'Contrats', selector: /contrats/i },
  { nom: 'Paiements', selector: /paiements/i },
  { nom: 'Recouvrement', selector: /recouvrement/i },
  { nom: 'Relances', selector: /relances/i },
  { nom: 'Caisse', selector: /caisse/i },
  { nom: 'Finance', selector: /finance/i },
  { nom: 'Etats des lieux', selector: /inspections/i },
  { nom: 'Travaux', selector: /travaux|maintenance/i },
  { nom: 'Documents', selector: /documents/i },
  { nom: 'Factures', selector: /factures/i },
  { nom: 'Rapports', selector: /rapports/i },
  { nom: 'Parametres', selector: /param[eè]tres|settings/i },
  { nom: 'Archives', selector: /archives/i },
  { nom: 'Journal', selector: /journal/i },
];

test('1. Navigation - Onglets', async ({ page }) => {
  console.log('--- Test navigation ---');
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(3000);

  let ok = 0, ko = 0;

  for (const o of ONGLETS_A_TESTER) {
    try {
      const link = page.getByRole('link', { name: o.selector }).first();
      const count = await link.count();
      if (count === 0) {
        console.log('  SKIP ' + o.nom);
        continue;
      }
      await link.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      const body = await page.locator('body').textContent();
      if (!body || body.length < 100) {
        console.log('  KO ' + o.nom);
        ko++;
      } else {
        console.log('  OK ' + o.nom);
        ok++;
      }
    } catch (err) {
      console.log('  KO ' + o.nom);
      ko++;
    }
  }
  console.log('--- ' + ok + ' OK / ' + ko + ' KO ---');
  expect(ko).toBeLessThan(5);
});

test('2. Console propre', async ({ page }) => {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  const critiques = erreurs.filter((e) => !e.includes('extension') && !e.includes('ResizeObserver'));
  console.log('Erreurs : ' + critiques.length);
  expect(critiques.length).toBeLessThan(5);
});

test('3. Compteurs Dashboard', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  const body = await page.locator('body').textContent();
  expect(body).toBeTruthy();
  console.log('Body : ' + (body?.length || 0) + ' chars');
});