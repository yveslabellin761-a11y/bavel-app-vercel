# Bavel

Bavel est une application de rencontres construite avec React, TypeScript, Vite, Express et Supabase. Le serveur Express sert l’API et l’application web; Capacitor permet de produire les versions Android et iOS.

## Développement local

Prérequis : Node.js 22.12 ou ultérieur et npm.

```sh
npm ci
npm run prepare:production-env
npm run dev
```

Renseignez les variables Supabase nécessaires dans `.env` avant de vous connecter. Les courriels d’inscription et de récupération de compte sont envoyés par Supabase Auth; si Resend est utilisé comme SMTP personnalisé dans Supabase, sa clé API reste dans la configuration Supabase, pas dans le client Bavel.

## Vérifications et build

```sh
npm run lint
npm run lint:style
npm test
npm run build
```

Avant un déploiement, configurez les secrets et URL réels décrits dans [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md), puis exécutez `npm run build:production`. Les fonctions de paiement, notifications, IA et vérification dépendent de leurs intégrations et paramètres respectifs; consultez [SECURITY_STATUS.md](./SECURITY_STATUS.md) pour leur état connu.

Pour Android et iOS, `VITE_API_BASE_URL` doit désigner l’origine HTTPS réellement déployée de l’API avec un certificat valide. Les builds GitHub Actions lisent cette URL dans la variable de dépôt `VITE_API_BASE_URL`.
