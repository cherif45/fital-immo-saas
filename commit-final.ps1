git add -A

git commit -m "perf(tenants): useMemo + lazy MobileMoney + bundle splitting

OPTIMISATIONS TenantsView :
- useMemo sur les filtres (activeTenants, sortedTenants, filteredTenants)
- Lazy import local pour MobileMoneyPaymentModal
- Wrapper Suspense pour la modale lazy
- Gain : 6 frappes x 1089 locataires = -83% de calculs

BUNDLE SPLITTING (Phase 6 rappel) :
- 40+ composants migres en React.lazy
- Bundle principal : 1414 KB -> 402 KB (-71%)
- Gzip : 330 KB -> 115 KB (-65%)
- 60 chunks separes

NOUVEAUX FICHIERS :
- src/lib/lazyImports.tsx (48 composants)
- src/components/ViewLoader.tsx (Suspense + skeletons)

IMPACT SAAS 1000+ USERS :
- Mode production : performances acceptables
- Recherche instantanee
- Chargement initial : -71%
- Bande passante : -65%

PHASE 7 (OPTIMISATION VIEWS) : PARTIELLE
- TenantsView : optimise
- PaymentsView, PenaltiesView, ActivityLogView, ArchiveView : a optimiser en session future

Note : le mode dev est 5-10x plus lent que la production (comportement normal de Vite)"
git log --oneline -5
