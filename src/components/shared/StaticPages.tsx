import React from 'react';

const LogoHeart = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block ${className}`}>
    <path d="M 45 85 C 45 85, 20 55, 20 30 C 20 15, 35 10, 45 20 C 50 25, 50 25, 50 25 C 50 25, 50 25, 55 20 C 65 10, 80 15, 80 30 C 80 45, 65 60, 65 60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Header = ({ onBack }: { onBack: () => void }) => (
  <div className="w-full bg-[#7B2539] flex items-center justify-between p-3 md:p-4 shadow-sm shrink-0">
    <div className="flex items-center">
      <LogoHeart className="w-8 h-8 text-white mr-2" />
      <span className="text-[20px] font-bold text-white tracking-tight">Bavel</span>
    </div>
    <button onClick={onBack} className="text-white hover:opacity-80 flex items-center">
      <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
      <span>Retour</span>
    </button>
  </div>
);

const PageLayout = ({ title, children, onBack }: { title: string, children: React.ReactNode, onBack: () => void }) => (
  <div className="min-h-screen flex flex-col bg-gray-50/50 font-sans animate-in fade-in duration-300">
    <Header onBack={onBack} />
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-6 py-10 md:py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-[#333] mb-8">{title}</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-10 text-gray-700 space-y-4">
          {children}
        </div>
      </div>
    </div>
  </div>
);

export const AboutUs = ({ onBack }: { onBack: () => void }) => (
  <PageLayout title="À Propos De Nous" onBack={onBack}>
    <p>
      Bienvenue sur Bavel, la première plateforme de rencontres conçue spécialement pour connecter les cœurs en Côte d'Ivoire et au-delà.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">Notre Mission</h2>
    <p>
      Notre mission est de créer un espace sûr, authentique et chaleureux où les personnes peuvent se rencontrer, échanger et bâtir des relations significatives, qu'il s'agisse de nouvelles amitiés ou du grand amour.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">Pourquoi Bavel ?</h2>
    <p>
      Nous comprenons l'importance de la culture et des valeurs partagées. Bavel célèbre la diversité et la richesse de la culture ivoirienne tout en offrant des outils modernes pour faciliter les connexions.
    </p>
    <ul className="list-disc pl-5 mt-4 space-y-2">
      <li>Profils authentiques et vérifiés</li>
      <li>Interface intuitive et facile à utiliser</li>
      <li>Respect de la confidentialité et sécurité renforcée</li>
    </ul>
  </PageLayout>
);

export const TermsOfUse = ({ onBack }: { onBack: () => void }) => (
  <PageLayout title="Conditions Générales D'utilisation" onBack={onBack}>
    <p>
      Bienvenue sur Bavel. En utilisant notre plateforme, vous acceptez les présentes Conditions Générales d'Utilisation.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">1. Acceptation des Conditions</h2>
    <p>
      L'accès et l'utilisation de nos services sont soumis à l'acceptation et au respect des présentes conditions. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser Bavel.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">2. Éligibilité</h2>
    <p>
      Vous devez avoir au moins 18 ans pour créer un compte et utiliser nos services. En créant un compte, vous garantissez que vous avez la capacité légale de conclure un contrat contraignant.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">3. Règles de Conduite</h2>
    <p>
      Vous acceptez de vous comporter de manière respectueuse et courtoise envers les autres utilisateurs. Tout comportement abusif, harceleur, ou la publication de contenu inapproprié entraînera la suspension immédiate de votre compte.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">4. Contenu Utilisateur</h2>
    <p>
      Vous êtes seul responsable du contenu que vous publiez sur Bavel. Vous nous accordez une licence non exclusive pour utiliser ce contenu dans le cadre du fonctionnement de nos services.
    </p>
  </PageLayout>
);

export const PrivacyPolicy = ({ onBack }: { onBack: () => void }) => (
  <PageLayout title="Déclaration De Confidentialité" onBack={onBack}>
    <p>
      La protection de vos données personnelles est une priorité pour Bavel.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">1. Collecte des Données</h2>
    <p>
      Nous collectons les informations que vous nous fournissez lors de votre inscription (nom, adresse email, âge, genre, photos) ainsi que les données relatives à votre utilisation de l'application (préférences, interactions).
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">2. Utilisation des Données</h2>
    <p>
      Vos données sont utilisées pour vous fournir nos services, personnaliser votre expérience, vous suggérer des profils compatibles, et assurer la sécurité de la plateforme.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">3. Partage des Données</h2>
    <p>
      Nous ne vendons jamais vos données personnelles à des tiers. Nous pouvons partager certaines informations avec des prestataires de services de confiance pour nous aider à faire fonctionner l'application.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">4. Vos Droits</h2>
    <p>
      Vous avez le droit d'accéder à vos données, de les modifier ou de demander leur suppression à tout moment via les paramètres de votre compte ou en nous contactant.
    </p>
  </PageLayout>
);

export const DatingSafety = ({ onBack }: { onBack: () => void }) => (
  <PageLayout title="Sécurité Des Rencontres" onBack={onBack}>
    <p>
      Faire des rencontres en ligne doit rester une expérience positive et sûre. Voici quelques conseils de sécurité importants.
    </p>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">Protéger Vos Informations</h2>
    <ul className="list-disc pl-5 space-y-2">
      <li>Ne partagez jamais vos informations financières (carte de crédit, coordonnées bancaires).</li>
      <li>Gardez vos informations personnelles (adresse de domicile, lieu de travail) privées jusqu'à ce que vous ayez une confiance totale.</li>
      <li>Restez sur la plateforme pour communiquer initialement. Méfiez-vous de ceux qui veulent passer rapidement sur une autre application de messagerie.</li>
    </ul>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">Lors d'une Rencontre en Personne</h2>
    <ul className="list-disc pl-5 space-y-2">
      <li>Rencontrez-vous toujours dans un lieu public et fréquenté.</li>
      <li>Informez un ami ou un membre de votre famille de vos plans (qui vous rencontrez, où et quand).</li>
      <li>Ne comptez pas sur l'autre personne pour votre transport. Prévoyez votre propre moyen de vous y rendre et de rentrer.</li>
      <li>Faites confiance à votre instinct. Si vous vous sentez mal à l'aise, n'hésitez pas à écourter la rencontre ou à demander de l'aide au personnel du lieu.</li>
    </ul>
    <h2 className="text-xl font-bold text-[#333] mt-8 mb-4">Signaler un Comportement</h2>
    <p>
      Si vous rencontrez un profil suspect ou si un utilisateur a un comportement inapproprié, veuillez le signaler immédiatement via la fonction de signalement de l'application ou en contactant notre support.
    </p>
  </PageLayout>
);
