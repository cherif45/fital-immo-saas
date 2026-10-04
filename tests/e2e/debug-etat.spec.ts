import { test, expect } from '@playwright/test';

test('Debug - Etat de la page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  const body = await page.locator('body').textContent();
  console.log('');
  console.log('=== ANALYSE DE LA PAGE ===');
  console.log('Body length : ' + (body?.length || 0));
  console.log('Body extrait (500 chars) :');
  console.log((body || '').substring(0, 500));
  console.log('');

  // Compter les elements cliquables
  const links = await page.locator('a').count();
  const buttons = await page.locator('button').count();
  const navs = await page.locator('nav').count();
  const asides = await page.locator('aside').count();

  console.log('Liens <a> : ' + links);
  console.log('Boutons <button> : ' + buttons);
  console.log('Nav <nav> : ' + navs);
  console.log('Aside <aside> : ' + asides);
  console.log('');

  // Chercher LoginView ou Dashboard
  const hasLogin = (body || '').includes('Connexion') || (body || '').includes('Email') || (body || '').includes('Mot de passe');
  const hasDashboard = (body || '').includes('Dashboard') || (body || '').includes('Tableau');

  console.log('LoginView detecte : ' + hasLogin);
  console.log('Dashboard detecte : ' + hasDashboard);
  console.log('');

  // Screenshot
  await page.screenshot({ path: 'tests/debug-page.png', fullPage: false });
  console.log('Screenshot : tests/debug-page.png');
});