# État sécurité et préparation production

Dernière revue du dépôt : 1 octobre 2026. Ce document décrit le code et les contrôles exécutés; il ne certifie pas la configuration de l’hébergeur ni les services tiers.

## Actions urgentes

- Un rapport historique indique que des identifiants ont été exposés dans d’anciens fichiers ou journaux. Tant que chaque fournisseur concerné n’a pas confirmé la révocation et la rotation, considérez ces valeurs comme compromises. Vérifiez notamment les clés Supabase/service-role, JWT, VAPID et OAuth; ne recopiez aucune ancienne valeur.
- Les contrôles de domaine du 1 octobre 2026 montrent que `bavel.com` sert une page de parking Afternic, `api.bavel.com` échoue au handshake TLS (`unrecognized name`), `bavel.app` répond 404 et `www.bavel.app` redirige vers un site tiers. Ces domaines ne sont pas des cibles Bavel validées; configurez seulement un domaine dont vous contrôlez le DNS et le certificat. Le dépôt n’a pas de pipeline de déploiement applicatif configuré.
- Le contrôle local `npm run check:production` échoue tant que les URL publiques, Upstash et Sentry ne sont pas configurés avec les valeurs de production. Cela ne permet pas de conclure que l’hébergeur est mal configuré.

## Mesures présentes dans le code

- Les paiements sont fondés sur les offres du serveur et les webhooks; un paiement réel doit encore être testé en mode test chez chaque prestataire.
- Les récompenses de quêtes sont vérifiées côté serveur et attribuées via la fonction transactionnelle Supabase. La migration 35 est indiquée comme appliquée; le contrôle de schéma ne remplace pas une vérification des politiques RLS.
- Les routes de notifications push utilisent maintenant l’identité issue du jeton Supabase plutôt qu’un `userId` contrôlé par le client. L’inscription et le retrait sont limités au compte authentifié. Les notifications d’appel exigent un match existant et sont refusées si l’un des utilisateurs a bloqué l’autre.
- Les notifications de test, de relance et d’activité ne peuvent cibler que l’utilisateur authentifié. L’API distingue l’absence d’abonnement, les échecs et l’acceptation par le service Push; elle ne prétend pas confirmer la réception sur l’appareil.
- Les offres publicitaires récompensées sont désactivées tant qu’une attestation serveur du prestataire ne permet pas de prévenir les rejeux et crédits frauduleux.

## Fonctions non disponibles ou dépendantes d’un service externe

- L’IA générative interne est désactivée; plusieurs routes IA et de vérification répondent `503`. Les heuristiques locales ne sont pas une IA générative et ne prouvent pas une identité.
- La vérification photo/selfie dispose d’un parcours authentifié avec défi aléatoire, contrôle de présence/anti-spoof local et comparaison de plusieurs images du selfie aux photos du compte. Le serveur est seul autorisé à attribuer le badge; toute modification des photos de profil l’invalide. Les images décodées, descripteurs et tenseurs d’inférence sont effacés des buffers détenus par le service après analyse; le schéma ne conserve que l’état, le défi et un condensat des références aux photos.
- Ce contrôle photo n’est pas une vérification d’identité ni une garantie absolue anti-fraude, et ne reproduit pas le système propriétaire de Badoo. Cinq images envoyées par le client ne constituent pas une preuve cryptographique de capture vidéo continue. Les modèles ouverts et leurs seuils doivent encore être évalués sur des appareils, conditions de capture et groupes démographiques représentatifs, ainsi qu’avec des tests de rejeu/spoofing, avant toute affirmation forte sur le badge. La détection de photos volées, les documents d’identité et la détection CSAM restent non intégrés.
- La détection multi-comptes, la recherche inversée de photos volées et la détection CSAM ne sont pas intégrées. Elles ne sont ni exécutées ni annoncées comme disponibles.
- Les paiements Stripe et Mobile Money dépendent des secrets serveur, des comptes prestataires et de tests réels de webhooks; leur fonctionnement de bout en bout n’a pas été validé ici.
- Resend configuré comme SMTP personnalisé de Supabase sert aux e-mails Supabase Auth; sa clé ne doit pas être ajoutée aux variables `VITE_*` ni au dépôt.
- La migration selfie `20260930125800_profile_photo_verification.sql` a été appliquée au projet Supabase lié le 1 octobre 2026 après confirmation de sauvegarde et autorisation; le contrôle de schéma et la vérification RLS en lecture seule sont passés ensuite. Le contrôle HTTPS de `https://api.bavel.com/health` échoue pendant TLS (`unrecognized name`); corriger et revalider l’hôte avant les builds mobiles de production.

## Vérifications effectuées

- `npm test`, compilation TypeScript, lint ESLint (0 erreurs, 28 avertissements de dépendances React Hooks), contrôle de formatage, build web/serveur, couverture offline (80,92 % lignes) et `npm audit --audit-level=high` ont réussi lors de la revue.
- L’historique Supabase distant correspond aux migrations locales jusqu’à la migration `20260930125700`; le contrôle des colonnes et buckets attendus a également réussi.
- `scripts/verify-supabase-rls.sql` a été exécuté en lecture seule sur le projet Supabase lié le 1 octobre 2026, après la migration selfie, et n’a retourné aucun constat. Rejouez-le avant publication si les politiques ont changé depuis.
- Le navigateur local affiche l’écran d’accueil sans erreur console. Il signale en développement l’absence du script de service worker; vérifiez le service worker dans le build hébergé.

## Avant publication

1. Confirmer la rotation de tous les secrets potentiellement exposés.
2. Configurer et vérifier le domaine API HTTPS, puis définir `VITE_API_BASE_URL` dans **Settings → Secrets and variables → Actions → Variables** du dépôt.
3. Renseigner Upstash, Sentry et l’origine publique dans l’environnement de déploiement; exécuter `npm run build:production`.
4. Vérifier RLS dans Supabase, puis effectuer des tests de parcours avec des comptes de test : authentification, notifications push, paiement prestataire en mode test et réclamation d’une quête éligible.
5. Appliquer la migration `20260930125800_profile_photo_verification.sql` avant d’utiliser le parcours photo; l’application distante n’a pas été modifiée par cette session. Tester le parcours authentifié sur les appareils et réseaux réellement pris en charge, puis mesurer faux positifs/négatifs, latence, capacité serveur, résistance aux rejeux et écarts entre groupes avant activation générale. Garder désactivées la détection de photos volées, la détection CSAM et la détection multi-comptes jusqu’à leur intégration réelle.
