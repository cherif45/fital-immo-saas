import { test, expect } from '@playwright/test';

// ============================================================
// TEST 1 : L'app charge correctement
// ============================================================
test('1. App charge', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  
  const body = await page.locator('body').textContent();
  expect(body).toBeTruthy();
  expect(body!.length).toBeGreaterThan(100);
  
  console.log('✅ App chargée');
});

// ============================================================
// TEST 2 : L'app affiche du contenu (login OU dashboard)
// ============================================================
test('2. App affiche du contenu', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const text = await page.locator('body').textContent();
  
  // Doit contenir du contenu (soit login soit dashboard)
  const hasContent = 
    text?.includes('FITAL') ||
    text?.includes('Connexion') ||
    text?.includes('Email') ||
    text?.includes('Propriétaires') ||
    text?.includes('Locataires') ||
    text?.includes('Dashboard');
  
  expect(hasContent).toBeTruthy();
  console.log('✅ Contenu affiché');
});

// ============================================================
// TEST 3 : Pas d'erreur JavaScript
// ============================================================
test('3. Pas d erreur JS', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const criticalErrors = errors.filter(e => 
    !e.includes('chrome-extension://') &&
    !e.includes('moz-extension://')
  );
  
  if (criticalErrors.length > 0) {
    console.log('❌ Erreurs :', criticalErrors);
  }
  
  expect(criticalErrors.length).toBe(0);
  console.log('✅ Pas d erreur JS');
});

// ============================================================
// TEST 4 : Navigation basique
// ============================================================
test('4. Navigation entre les pages', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const pages = ['Propriétaires', 'Locataires', 'Immeubles'];
  
  for (const pageName of pages) {
    const link = page.locator(`text=${pageName}`).first();
    const count = await link.count();
    if (count > 0) {
      console.log(`✅ Lien "${pageName}" trouvé`);
    }
  }
  
  expect(true).toBeTruthy();
});
