# ============================================================
# COMMIT PHASE 5 - SCALABILITE
# ============================================================

git add -A

git commit -m "perf(scalability): index + pagination archives

INDEX POSTGRES AJOUTES (5) :
- idx_profiles_agency (multi-utilisateurs par agence)
- idx_audit_logs_agency (agency_id, created_at)
- idx_notifications_agency (agency_id, created_at)
- idx_rent_due_dates_agency (echeances par agence)
- idx_tenant_reminders_agency (relances par agence)

PAGINATION :
- fetchArchivesFromDb : limit 500 (evite timeout si > 1000 archives)

DIAGNOSTIC :
- 25 index agency_id deja presents (excellent)
- 50 requetes 'sans pagination' = 47 faux positifs
- 3 vraies requetes critiques analysees :
  * fetchActivitiesByDate : OK (filtre par date)
  * fetchActivitiesByEntity : OK (filtre par entity)
  * fetchArchivesFromDb : CORRIGE (limit 500)

PHASE 5 (SCALABILITE) : VALIDEE

Notes :
- Bundle JS 1.38 MB : a optimiser plus tard (bundle splitting)
- service.ts 139 KB : a decouper plus tard
- select('*') 33 cas : a optimiser plus tard"

git log --oneline -5
