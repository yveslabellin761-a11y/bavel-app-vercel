# 🚀 Guide de Déploiement Production - Bavel

## État bloquant vérifié le 3 octobre 2026

- La migration `20260930125800_profile_photo_verification.sql` a été appliquée au projet Supabase lié le 1 octobre 2026 après confirmation de sauvegarde et autorisation. `npm run check:migrations` confirme maintenant les colonnes distantes et le bucket photo.
- La configuration locale contient Supabase, Upstash, Sentry et VAPID, mais `FRONTEND_URL` pointe encore vers HTTP local et aucune configuration Stripe ou Mobile Money complète n’est présente. Le contrôle `npm run check:production` refuse désormais une origine non HTTPS, l’absence de prestataire de paiement et les clés Stripe de test en production.
- La dernière vérification disponible des domaines a trouvé `bavel.com` sur une page de parking, `api.bavel.com` en échec TLS (`unrecognized name`), `bavel.app` sur un site tiers de traduction et `www.bavel.app` redirigé vers ce site. N’utilisez aucun de ces hôtes en production sans confirmer que vous en contrôlez le DNS, l’hébergement et le certificat.
- Le dépôt ne contient pas de pipeline de déploiement backend/frontend vers un hébergeur; les workflows présents valident le code et construisent des artefacts mobiles de développement/simulateur. La cible et les commandes de déploiement doivent être choisies et configurées avant toute publication.
- Le calcul d’affinité est une comparaison déterministe des données de profil, pas une IA générative, une vérification d’identité ou une confirmation de badge. Le statut `/api/ai/status` signale clairement que l’IA générative reste désactivée.
- Les profils ne sont plus repris depuis l’index local `bavel_accounts_by_email`; Supabase est la source de vérité et la déconnexion/suppression du compte efface aussi l’ancienne clé de cache. Un profil n’est activé comme Premium qu’après actualisation des droits du portefeuille serveur et lecture d’une commande marquée payée.
- L’architecture cible préparée est **Vercel pour le frontend statique** et **Render pour l’API Node/Express et son WebSocket persistant**. `vercel.json` configure le build Vite et le fallback SPA; `render.yaml` configure le service web Node, le contrôle `/health`, les variables nécessaires et désactive le déploiement automatique.
- Le déploiement n’est pas encore lancé : il faut connecter le dépôt dans Vercel et Render, relever les URL attribuées, puis saisir les variables dans leurs tableaux de bord. Les secrets ne doivent être placés ni dans `vercel.json`, ni dans `render.yaml`, ni dans Git.
- Aucun changement distant ni déploiement n’est effectué par ce guide. N’appliquez pas de migration en production sans sauvegarde et approbation.

## Architecture de déploiement retenue

Vercel héberge les fichiers statiques React/Vite; Render héberge l’application Express complète, les routes API et le WebSocket de notifications. Ne configurez pas `server.ts` comme fonction Vercel : le serveur utilise un listener HTTP persistant, des mises à niveau WebSocket et des tâches de fond.

1. Importez ce dépôt dans Vercel avec le preset Vite. `vercel.json` définit `npm run build:web`, le dossier `dist` et le fallback SPA pour les routes React.
2. Importez le même dépôt dans Render comme **Blueprint** et validez le service `bavel-api` décrit dans `render.yaml`. Il utilise l’offre payante `starter` (service toujours actif, nécessaire pour un backend temps réel de production); son build exécute `npm ci --include=dev && npm run build`, son démarrage `npm start`, et Render contrôle `/health`. Le déploiement automatique est désactivé tant que vous ne l’activez pas volontairement.
3. Au premier déploiement Vercel, notez son origine HTTPS `*.vercel.app`. Dans Render, configurez `FRONTEND_URL` sur cette origine et renseignez les variables serveur. Déployez ensuite l’API; utilisez son URL HTTPS Render comme `VITE_API_BASE_URL` dans les variables Vercel et relancez le build frontend.
4. Dans Vercel, configurez `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` et `VITE_SENTRY_DSN` si le projet Sentry navigateur est activé. Seule la clé Supabase anon/publishable peut être exposée au frontend; jamais la clé service-role, `JWT_SECRET`, Redis ou un secret de paiement.
5. Dans Render, saisissez `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `FRONTEND_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` et `SENTRY_DSN`. Saisissez le groupe VAPID complet pour les notifications Push. Pour vendre, configurez un prestataire complet : `STRIPE_SECRET_KEY` en mode live avec `STRIPE_WEBHOOK_SECRET`, ou toutes les variables Mobile Money du blueprint, dont le secret de webhook. Les callbacks du prestataire doivent viser les routes webhook exactes exposées par l’API.
6. Une fois les deux services déployés, vérifiez `/health`, `/api/ai/status`, l’authentification, un parcours de profil, la connexion WebSocket et un paiement de test dans l’environnement test du prestataire. Ne passez les paiements en mode réel qu’après avoir validé les webhooks/idempotence et défini les prix et conditions commerciales.

Les URL `vercel.app` et `onrender.com` sont des domaines de démarrage attribués par les hébergeurs, pas des domaines personnalisés revendiqués par Bavel. Vous pourrez rattacher plus tard des domaines que vous contrôlez; après changement d’origine, mettez à jour `FRONTEND_URL`, `VITE_API_BASE_URL`, les URL de retour et les origines/callbacks OAuth Supabase. L’API autorise CORS uniquement pour l’origine frontend configurée et les origines locales exactes des WebViews Capacitor.

## 📋 Étape 1: Appliquer les migrations Supabase

1. Les migrations 28 à 35 sont appliquées au projet Supabase lié et vérifiées dans son historique. La migration 35 a été appliquée le 30 septembre 2026; ses deux fonctions ont été vérifiées et ne sont exécutables que par `service_role`.
2. La migration 33 retire `TRUNCATE`, `REFERENCES` et `TRIGGER` aux rôles clients sur les tables publiques. Elle ne retire pas les opérations usuelles contrôlées par RLS.
3. Le problème `spatial_ref_sys` a été résolu dans Supabase en déplaçant PostGIS vers le schéma `extensions` et en recréant `activities.location` en `extensions.geography(Point, 4326)`. Vérifications faites : `extensions.spatial_ref_sys` est hors de `public`, `anon` peut la lire sans aucun droit client d’écriture, la colonne de géolocalisation est présente et la table temporaire de sauvegarde a été supprimée.
   Contrôle REST effectué avec la clé anon : PostgREST n’expose que `public` et `graphql_public` (`PGRST106` pour `extensions`). Gardez `extensions` hors de **Settings → API → Exposed schemas**. Les `GRANT USAGE` et `GRANT SELECT` exécutés dans SQL autorisent les rôles PostgreSQL à accéder aux objets concernés, mais ne rendent pas le schéma accessible via l’API REST tant qu’il n’est pas exposé.
4. `supabase/30_spatial_reference_rls.sql` vérifie désormais ces postconditions; ne réexécutez pas l’ancien SQL `ALTER TABLE public.spatial_ref_sys`.
5. La migration 34 répare la politique d’insertion de `activity_messages` : l’expéditeur doit être connecté et participer à la même activité que le message.
6. La migration 35 rend le catalogue de paiement serveur, assure l’idempotence de la confirmation des commandes et crédite les quêtes uniquement après vérification des photos, de la bio ou des swipes enregistrés. Son application et les privilèges de ses fonctions sont vérifiés; les parcours réels de paiement et de récompense restent à tester.
7. `scripts/verify-supabase-rls.sql` contrôle aussi les privilèges d’écriture de `spatial_ref_sys` dans `public` ou `extensions`. Exécutez-le; la sortie attendue est vide.
8. La migration selfie a été appliquée et `npm run check:migrations` est passé. Rejouez `scripts/verify-supabase-rls.sql` avant publication; le contrôle exécuté après migration n’a retourné aucun constat.

La liste initiale de versions de migrations Supabase était vide alors que la base contenait déjà des tables. Les réparations ont donc été exécutées explicitement, sans rejouer l’historique à l’aveugle. **Sauvegardez la base et examinez chaque migration historique avant de la rejouer.** La migration 30 vérifie maintenant le déplacement sécurisé de PostGIS; elle n’active pas RLS sur la table d’extension.

Le contrôle RLS doit maintenant être vide. Le script `npm run check:migrations` vérifie des colonnes et des buckets, mais ne remplace pas `scripts/verify-supabase-rls.sql`.

## 🔧 Étape 2: Configurer les variables d'environnement

Ajoutez ces variables à votre fichier `.env` :

Utilisez **Node.js 22.12.0 ou supérieur** pour installer et exécuter Bavel; cette version est requise par les dépendances Supabase actuellement verrouillées.

```bash
# Supabase Production Keys
SUPABASE_URL=https://qhrasmepglgfoeiglofi.supabase.co
SUPABASE_ANON_KEY=votre_clé_anonyme_existante
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role_à_générer

# Générer le secret et l’enregistrer dans les variables d’environnement du serveur
npm run generate:jwt-secret
```

**Pour obtenir la clé Service Role :**

1. Dashboard Supabase → **Settings** → **API**
2. Scrollez vers **Project API keys**
3. Copiez la clé secrète serveur/service role. Ne la placez jamais dans une variable `VITE_*`.

## 🚨 Étape 3: Variables d'environnement requises pour production

```bash
# Générez un secret unique pour cet environnement avec: openssl rand -base64 48
JWT_SECRET=valeur_aleatoire_a_configurer
FRONTEND_URL=https://votre-domaine-web
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SENTRY_DSN=https://clé-publique@o000000.ingest.sentry.io/000000
VITE_SENTRY_DSN=https://clé-publique@o000000.ingest.sentry.io/000001
VAPID_PUBLIC_KEY=votre_clé_vapid_public
VAPID_PRIVATE_KEY=votre_clé_vapid_private
VAPID_EMAIL=mailto:admin@bavel.app
STRIPE_SECRET_KEY=clé_secrète_Stripe
STRIPE_WEBHOOK_SECRET=secret_signature_Stripe
MOBILE_MONEY_CHECKOUT_URL=https://prestataire.example/checkout
MOBILE_MONEY_API_KEY=clé_api_prestataire
MOBILE_MONEY_MERCHANT_ID=identifiant_marchand
MOBILE_MONEY_WEBHOOK_SECRET=secret_signature_prestataire
MOBILE_MONEY_COUNTRIES=CI,SN
```

`FRONTEND_URL` est l’URL canonique de l’application. L’ancienne variable `APP_URL` est ignorée par le code actuel; remplacez-la progressivement par `FRONTEND_URL`. Le rate limiting utilise Upstash Redis REST partagé entre les instances. Configurez les deux variables Upstash ainsi que les DSN Sentry serveur et navigateur avant la mise en production. Pour générer un secret fort, exécutez `npm run generate:jwt-secret`, puis copiez la ligne affichée dans les variables de l’hébergeur. Utilisez un secret différent par environnement et ne le réutilisez pas après exposition. Les clés privées restent côté serveur.

Pour préparer votre fichier local sans écraser vos clés, exécutez `npm run prepare:production-env`. Cette commande ajoute uniquement les entrées Upstash/Sentry absentes, retire l’ancienne variable `APP_URL`, préserve toutes les valeurs déjà présentes et limite les permissions du `.env` à l’utilisateur courant. Vous pourrez ensuite ouvrir `.env` et coller les valeurs à la main. Pour la production, saisissez les valeurs dans **Settings / Environment Variables** de l’hébergeur. Ne remplacez pas votre `.env` local existant par le modèle : il peut déjà contenir des clés privées. Toutes les entrées `VITE_*` sont publiques ou incorporées au bundle web; n’y mettez jamais de mot de passe, secret de service ou token privé.

Origine des valeurs :

- **Supabase** : `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` depuis les paramètres API du projet. Les deux variables `VITE_SUPABASE_*` utilisent l’URL et la clé anon uniquement.
- **E-mails d’authentification (Resend)** : Bavel utilise Supabase Auth pour l’inscription, la confirmation d’adresse, le changement d’adresse et la réinitialisation du mot de passe. Si Resend est configuré comme SMTP personnalisé dans Supabase, la `RESEND_API_KEY` et l’adresse d’expédition doivent rester dans le tableau de bord Supabase; aucune variable `RESEND_*` supplémentaire n’est nécessaire dans le `.env` Bavel. Ne copiez jamais la clé Resend dans une variable `VITE_*` ni dans Git.
- **Upstash** : `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` depuis la base Redis REST.
- **Sentry** : `SENTRY_DSN` depuis le projet serveur Node/Express et `VITE_SENTRY_DSN` depuis le projet navigateur React.
- **Domaine** : `FRONTEND_URL` est l’origine publique HTTPS de l’interface. `VITE_API_BASE_URL` est l’origine HTTPS de l’API et nécessaire aux applications natives.
- **Paiements** : les prix et crédits sont lus uniquement du catalogue serveur. Configurez les secrets Stripe et/ou Mobile Money ci-dessus; ne transmettez jamais de montant ou de crédits depuis le client et testez chaque webhook avec une commande de test.
- **Facebook/Google OAuth** : fournissez les secrets dans Supabase Auth et dans les consoles des fournisseurs. Bavel n’utilise pas le Facebook SDK; `FACEBOOK_APP_ID` n’est donc pas une variable requise.

Pour les e-mails Resend, vérifiez dans **Supabase → Authentication → SMTP Settings** que le SMTP personnalisé est activé avec l’hôte `smtp.resend.com`, le port choisi dans Resend, l’identifiant SMTP `resend`, la clé API Resend comme mot de passe, et une adresse d’expédition appartenant à un domaine vérifié dans Resend. Configurez également **Authentication → URL Configuration → Site URL** sur l’origine publique de l’application, puis autorisez cette origine et les URL de retour utilisées par l’application dans **Redirect URLs**. Bavel utilise l’origine courante pour l’inscription et `${origin}/reset-password` pour la réinitialisation. Pour localhost, ajoutez explicitement l’origine et le callback locaux nécessaires au développement. La clé reste uniquement dans la configuration SMTP de Supabase; l’environnement local Bavel possède déjà ses variables Supabase.

Dans Upstash, créez une base Redis, puis copiez son **REST URL** dans `UPSTASH_REDIS_REST_URL` et son **REST Token** dans `UPSTASH_REDIS_REST_TOKEN` sur l’hébergeur backend. Le serveur vérifie réellement l’accès à Redis au démarrage en production et refuse de démarrer si le service partagé est indisponible; les requêtes sont également refusées en `503` en cas de panne ultérieure, sans retomber sur des quotas locaux.

Dans Sentry, créez deux projets (Node.js/Express pour le serveur et React pour le navigateur) et configurez leurs DSN respectifs dans `SENTRY_DSN` et `VITE_SENTRY_DSN`. Le premier est un secret côté serveur; le DSN navigateur est public et doit être présent au moment du build web. Exécutez `npm run build:production` dans l’environnement de déploiement, où les variables sont disponibles : ce script valide les deux DSN et les identifiants Upstash avant de produire les bundles.

Les jobs iOS/Android de GitHub Actions exigent les variables de dépôt `VITE_API_BASE_URL` et `VITE_SUPABASE_URL`, ainsi que le secret `VITE_SUPABASE_ANON_KEY`; configurez-les dans **Settings → Secrets and variables → Actions**. `VITE_API_BASE_URL` doit être l’origine HTTPS réellement déployée et son certificat TLS doit être valide. Les builds natifs sont refusés si ces configurations sont absentes ou utilisent un placeholder, au lieu de produire silencieusement une application qui ne peut pas se connecter.

L’IA générative interne reste désactivée : son adaptateur de génération n’est pas implémenté, donc l’activer par configuration donnerait une fausse disponibilité. L’endpoint `/api/ai/status` indique maintenant cet état comme indisponible. Les règles locales et la modération d’image par modèle local sont des composants séparés.

### Clés d’accès (Passkeys Supabase)

Les inscriptions et connexions par clé d’accès utilisent l’API Passkeys de **Supabase Auth**; les options WebAuthn sont donc configurées dans **Supabase → Authentication → Passkeys**, et non dans les variables `.env` de Bavel.

- **Relying Party Display Name** : `Bavel`.
- **Relying Party ID** : le domaine exact de production sans protocole, port ni chemin (par exemple `bavel.app`). Il doit rester stable après l’enregistrement des premières clés; le changer rendrait les clés existantes inutilisables.
- **Relying Party Origins** : l’origine complète de production (`https://…`) et, si nécessaire, les origines de sous-domaines de ce domaine. Le nom d'hôte de chaque origine doit correspondre au RP ID ou en être un sous-domaine. En local, configurez l’origine exacte affichée dans le navigateur; le serveur Bavel utilise par défaut le port `3000`, donc `http://localhost:3000` et `http://127.0.0.1:3000` sont deux origines distinctes. Pour les tester, utilisez un projet Supabase de développement séparé avec `localhost` ou `127.0.0.1` comme RP ID correspondant à l’origine choisie. L’application délègue le challenge et la vérification WebAuthn à Supabase Auth : aucun RP ID ou origine n’est codé en dur dans le frontend.

Dans le client, l’option expérimentale Passkeys de Supabase est activée; l’inscription se fait depuis les réglages du compte et la connexion est proposée sur l’écran d’accueil. Les passkeys précédemment créées par l’ancien mécanisme Bavel ne sont pas enregistrées dans Supabase Auth et devront être recréées après une connexion par e-mail, Google ou Facebook. Les tables SQL historiques de cet ancien mécanisme sont conservées, mais ne sont plus utilisées par l’application; ne les supprimez pas sans avoir vérifié les données qu’elles contiennent. Le test final nécessite un compte Bavel connecté et un appareil/navigateur compatible.

### Connexion Facebook

La connexion et la création de compte Facebook passent par **Supabase Auth**. Configurez l'App ID et l'App Secret dans **Supabase → Authentication → Sign In / Providers → Facebook**; `FACEBOOK_CLIENT_ID` et `FACEBOOK_CLIENT_SECRET` dans le `.env` de Bavel ne sont pas utilisés par ce parcours.

Dans **Meta for Developers → Facebook Login → Settings**, ajoutez comme URI OAuth de redirection valide le callback Supabase affiché pour votre projet, généralement `https://<project-ref>.supabase.co/auth/v1/callback`. Dans **Supabase → Authentication → URL Configuration**, autorisez également l'origine de l'application et son chemin de retour `/auth/callback` (en développement, l'origine locale réellement utilisée). Le navigateur doit revenir sur le même domaine/origine de l'application.

Le bouton de connexion a été vérifié jusqu'à l'écran de connexion Facebook. L'autorisation finale et la création de session nécessitent un compte Facebook test/autorisé et ne peuvent pas être certifiées sans effectuer cette connexion. La synchronisation du profil Facebook depuis un compte Bavel déjà créé reste désactivée.

### Récompenses vidéo et crédits

Les récompenses vidéo sont désactivées : les routes concernées répondent `410 Gone` et ne créditent aucun compte. N'ajoutez pas d'URL VAST pour les réactiver. Il faudra d'abord intégrer une vérification de visionnage côté serveur, fournie et signée par le prestataire publicitaire, puis tester la protection contre les rejeux et les doubles attributions.

## 🏗️ Étape 4: Build pour production

```bash
# Nettoyer les anciens builds
npm run clean

# Build pour production
npm run build:production

# Démarrer en mode production
npm start
```

## 🔍 Étape 5: Vérification avant déploiement

### Checklist :

- [ ] Script SQL exécuté avec succès
- [ ] Variables d'environnement configurées
- [ ] JWT_SECRET remplacé (pas de valeur par défaut)
- [ ] SUPABASE_SERVICE_ROLE_KEY configurée
- [ ] UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN configurés
- [ ] JWT_SECRET généré aléatoirement (au moins 32 octets), sans valeur UUID ni secret déjà exposé
- [ ] SENTRY_DSN et VITE_SENTRY_DSN valides, avec projets serveur/navigateur configurés
- [ ] FRONTEND_URL est l’origine HTTPS publique; ne pas dépendre de l’ancienne variable APP_URL
- [ ] Domaines frontend et API effectivement contrôlés par Bavel, avec DNS correct et certificats HTTPS valides (les domaines testés le 1 octobre 2026 ne sont pas prêts)
- [ ] Hébergeur frontend/backend choisi; pipeline de déploiement correspondant configuré et testé
- [ ] Build effectué sans erreurs
- [ ] Serveur testé localement avec `npm start`
- [ ] Toutes les fonctionnalités testées (login, swipe, match, messages)
- [x] `supabase/35_payment_catalog_and_gamification_rewards.sql` appliquée; fonctions présentes et exécution réservée à `service_role`
- [ ] Parcours complet de paiement testé avec les secrets du prestataire et webhooks réels en mode test
- [ ] Récompense de quête testée avec un compte de test éligible
- [ ] WebSocket de notifications testé avec une session Supabase valide; une connexion sans jeton doit être refusée

## 🚀 Étape 6: Déploiement sur l’hébergeur choisi

Choisissez d’abord une plateforme compatible avec le serveur Express/WebSocket et une plateforme pour le frontend si elles sont séparées. Configurez le domaine HTTPS sur la plateforme concernée, puis vérifiez DNS, certificat et endpoint `/health`. Les exemples ci-dessous sont indicatifs et ne constituent pas une configuration déjà présente dans le dépôt.

### Heroku (exemple indicatif) :

```bash
# Configurer les variables d'environnement
heroku config:set SUPABASE_URL="https://qhrasmepglgfoeiglofi.supabase.co"
heroku config:set SUPABASE_ANON_KEY="votre_clé"
heroku config:set SUPABASE_SERVICE_ROLE_KEY="votre_clé_service"
heroku config:set JWT_SECRET="votre_secret"

# Deploy
git push heroku main
```

### Vercel (exemple indicatif; valider l’exécution longue du serveur Express/WebSocket) :

```bash
# Ajouter les variables dans le dashboard Vercel
# Settings → Environment Variables

# Deploy
vercel --prod
```

## 📊 Étape 7: Monitoring post-déploiement

### Points à surveiller :

1. **Logs d'erreurs** - Vérifier les logs de connexion Supabase
2. **Performance** - Temps de réponse des API
3. **Supabase** - Utilisation de la base de données
4. **Push notifications** - Vérifier que les notifications fonctionnent

## 🆘 Dépannage

### Erreur "Missing Supabase credentials"

→ Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont configurés

### Erreur "JWT_SECRET not configured"

→ Configurez un `JWT_SECRET` fort dans les variables d'environnement

### Erreur de connexion Supabase

→ Vérifiez que la base de données est active et que les RLS policies sont correctes

### Push notifications ne fonctionnent pas

→ Vérifiez les clés VAPID et que le service est activé

## 🎯 Résumé de la migration Supabase

### Tables créées :

- ✅ `reset_tokens` - Reset passwords
- ✅ `user_passwords` - Hash mots de passe
- ✅ `user_security` - Paramètres sécurité
- ✅ `user_profiles_store` - Profils utilisateurs
- ✅ `encounters_likes` - Likes rencontres
- ✅ `encounters_matches` - Matches rencontres
- ✅ `push_subscriptions` - Abonnements push
- ✅ `security_logs` - Logs sécurité
- ✅ `telemetry` - Télémétrie
- ✅ `rate_limits` - Rate limiting

### Maps migrées vers Supabase :

- ✅ `resetTokens` → `reset_tokens`
- ✅ `userPasswords` → `user_passwords`
- ✅ `userSecurityStore` → `user_security`
- ✅ `userProfilesStore` → `user_profiles_store`
- ✅ `userPushSubscriptions` → `push_subscriptions`
- ✅ `userLastActiveStore` → `profiles.last_active_at`
- ✅ `userLastInactivityPushStore` → `profiles.last_inactivity_push_sent`
- ✅ `encountersLikesStore` → `encounters_likes`
- ✅ `encountersMatchesStore` → `encounters_matches`

### Maps restantes en mémoire (nécessaires) :

- ⚠️ `userSockets` - WebSocket connections (doit rester en mémoire)
- ⚠️ `userNotificationsStore` - Notifications temporaires
- ✅ Rate limiting API - compteurs Redis Upstash partagés en production; stockage mémoire uniquement en développement

## 🔐 Sécurité Production

### Points critiques :

1. **Jamais exposer** la `SUPABASE_SERVICE_ROLE_KEY` côté client
2. **Toujours utiliser** des clés JWT fortes
3. **Activer RLS** sur toutes les tables Supabase
4. **Surveiller** les logs de sécurité
5. **Limiter** les requêtes API avec rate limiting

Le schéma Supabase et les migrations de sécurité vérifiés ne suffisent pas à déclarer l'application prête pour la production. Configurez et testez toutes les variables d'environnement requises, les intégrations OAuth, le domaine HTTPS, les paiements et les builds mobiles avant d'ouvrir le service aux utilisateurs.
