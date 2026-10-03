import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Search,
  ChevronRight,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  HelpCircle,
  Coins,
  Shield,
  UserCheck,
  Crown,
  Heart,
  MessageCircle,
  Send,
  X,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { authFetch } from '../../lib/authFetch';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  quickAnswer: string;
  popular?: boolean;
}

interface AIResponse {
  question: string;
  answer: string;
  category?: string;
  suggestedQuestions?: string[];
  action?: {
    label: string;
    type: string;
  } | null;
}

const FAQ_CATEGORIES = [
  { id: 'all', label: 'Tout', icon: HelpCircle },
  { id: 'credits', label: 'Crédits & Vidéos', icon: Coins },
  { id: 'matchs', label: 'Matchs & Découverte', icon: Heart },
  { id: 'securite', label: 'Sécurité & Modération', icon: Shield },
  { id: 'profil', label: 'Profil & Badge Bleu', icon: UserCheck },
  { id: 'premium', label: 'Bavel Premium', icon: Crown },
  { id: 'messagerie', label: 'Messagerie & Appels', icon: MessageCircle },
];

const CURATED_FAQS: FAQItem[] = [
  {
    id: 'c1',
    category: 'credits',
    popular: true,
    question: 'Les crédits gratuits avec une vidéo sont-ils disponibles ?',
    quickAnswer: "Cette récompense est temporairement suspendue. Bavel la réactivera lorsque le visionnage pourra être validé de façon sécurisée côté serveur."
  },
  {
    id: 'm1',
    category: 'matchs',
    popular: true,
    question: 'Comment fonctionne le système de Match sur Bavel ?',
    quickAnswer: "Dans l'onglet **Découvrir**, balayez vers la droite (ou cliquez sur le Cœur) pour liker. Si la personne vous like également en retour, un **Match** est créé et la conversation privée se débloque instantanément."
  },
  {
    id: 's1',
    category: 'securite',
    popular: true,
    question: 'Comment activer le Mode Invisible pour visiter discrètement ?',
    quickAnswer: "Allez dans **Paramètres** > **Mode Invisible**. Une fois activé, vous pouvez explorer les profils sans laisser de trace dans leurs visites et masquer votre statut 'En ligne'."
  },
  {
    id: 'p1',
    category: 'profil',
    popular: true,
    question: 'Comment obtenir le badge bleu vérifié sur mon profil ?',
    quickAnswer: "Allez dans votre **Profil** > **Modifier** > **Vérification**. Prenez un selfie rapide en reproduisant la pose indiquée. Notre système valide votre identité en quelques secondes pour vous attribuer le badge de confiance."
  },
  {
    id: 'pr1',
    category: 'premium',
    popular: false,
    question: 'Quels sont les avantages de Bavel Premium / VIP ?',
    quickAnswer: "Bavel Premium vous permet de voir qui a liké votre profil, d'envoyer des likes illimités, d'accéder au mode invisible, d'obtenir 1 Boost offert par mois et de supprimer toute publicité."
  },
  {
    id: 's2',
    category: 'securite',
    popular: false,
    question: 'Comment fonctionne la protection photo Private Detector™ ?',
    quickAnswer: "Le **Private Detector™** de Bavel détecte automatiquement les photos intimes ou sensibles reçues par tchat et les floute par défaut. C'est vous qui choisissez de cliquer pour révéler l'image en toute sécurité."
  },
  {
    id: 'm2',
    category: 'messagerie',
    popular: false,
    question: 'Puis-je passer des appels audio et vidéo sans donner mon numéro ?',
    quickAnswer: "Oui ! Les appels audio et vidéo HD sont directement intégrés et chiffrés dans le tchat Bavel. Vous pouvez appeler vos matchs en toute confidentialité sans jamais divulguer votre numéro WhatsApp ou téléphonique."
  },
  {
    id: 'c2',
    category: 'credits',
    popular: false,
    question: 'À quoi servent les Crédits et comment les utiliser ?',
    quickAnswer: "Les crédits permettent d'activer le **Boost 30 minutes** (pour passer en tête de liste dans Découvrir), d'envoyer des **Coups de cœur** prioritaires et des **Cadeaux virtuels** pour capter l'attention de vos coups de foudre."
  }
];

export function InteractiveFAQ({
  onActionTrigger
}: {
  onActionTrigger?: (actionType: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  
  // AI Query & Response state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentAiResponse, setCurrentAiResponse] = useState<AIResponse | null>(null);
  const [aiHistory, setAiHistory] = useState<AIResponse[]>([]);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);
  const [feedbackToast, setFeedbackToast] = useState(false);

  const responseCardRef = useRef<HTMLDivElement>(null);

  const filteredFaqs = CURATED_FAQS.filter(faq => {
    const matchCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchSearch = searchQuery.trim() === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.quickAnswer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleAskAi = async (questionToAsk: string) => {
    if (!questionToAsk.trim() || isAiLoading) return;

    setIsAiLoading(true);
    setFeedbackGiven(null);
    setExpandedFaqId(null);

    try {
      const response = await authFetch('/api/faq/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionToAsk.trim(),
          category: selectedCategory !== 'all' ? selectedCategory : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Erreur réseau FAQ');
      }

      const data = await response.json();
      const newResponse: AIResponse = {
        question: questionToAsk.trim(),
        answer: data.answer || "Voici les informations utiles de Bavel.",
        category: data.category,
        suggestedQuestions: data.suggestedQuestions,
        action: data.action
      };

      setCurrentAiResponse(newResponse);
      setAiHistory(prev => [newResponse, ...prev.filter(h => h.question !== newResponse.question).slice(0, 4)]);

      // Smooth scroll to response
      setTimeout(() => {
        responseCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('FAQ AI fetch error:', err);
      setCurrentAiResponse({
        question: questionToAsk.trim(),
        answer: "L’assistant interne n’a pas pu obtenir de réponse. Réessayez plus tard ou contactez le support Bavel.",
        category: "Aide Bavel",
        suggestedQuestions: []
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFeedback = (type: 'yes' | 'no') => {
    setFeedbackGiven(type);
    setFeedbackToast(true);
    setTimeout(() => setFeedbackToast(false), 2500);
  };

  // Helper to render simple formatted markdown text for mobile
  const renderFormattedAnswer = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-2 text-[13.5px] leading-[1.6] text-gray-800 font-normal">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;
          
          // Format bullet points or bold markers
          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
          const isNumbered = /^\d+\./.test(line.trim());
          
          const cleanLine = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
          const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

          return (
            <div key={idx} className={`flex items-start ${isBullet || isNumbered ? 'pl-2 space-x-1.5' : ''}`}>
              {isBullet && <span className="text-rose-500 font-bold text-sm shrink-0 leading-[1.6]">•</span>}
              {isNumbered && (
                <span className="text-rose-600 font-bold text-xs bg-rose-50 border border-rose-100 rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 mr-1">
                  {line.trim().match(/^\d+/)?.[0]}
                </span>
              )}
              <div className="flex-1">
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={pIdx} className="font-bold text-black">
                        {part.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-6 select-none font-sans">
      {/* AI Header Card */}
      <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-[#e20030] rounded-2xl p-4 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-[15px] font-extrabold text-white tracking-tight leading-none">
                Assistant FAQ Intelligent
              </h3>
              <p className="text-[11px] text-white/85 font-medium mt-0.5">
                Réponses instantanées par Bavel Support 🇨🇮
              </p>
            </div>
          </div>
          
          <span className="text-[10px] font-extrabold bg-white/25 border border-white/30 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
            En ligne
          </span>
        </div>

        {/* Natural Language Prompt Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskAi(searchQuery);
          }}
          className="mt-3 relative z-10"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Posez votre question ici..."
              className="w-full bg-white text-black placeholder:text-gray-400 text-[13.5px] font-medium pl-3.5 pr-20 py-2.5 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-white/80 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-12 p-1 text-gray-400 hover:text-black cursor-pointer"
                aria-label="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!searchQuery.trim() || isAiLoading}
              className="absolute right-1.5 px-3 py-1.5 bg-[#121212] hover:bg-black disabled:bg-gray-300 text-white text-[12px] font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer active:scale-95 disabled:cursor-not-allowed shadow-xs"
            >
              {isAiLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Poster</span>
                  <Send className="w-3 h-3 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Categories Horizontal Carousel */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {FAQ_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-[12.5px] font-bold whitespace-nowrap flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#121212] text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-400' : 'text-gray-500'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI Generating Animation */}
      <AnimatePresence>
        {isAiLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm space-y-2.5"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              </div>
              <span className="text-[13px] font-bold text-gray-700">
                Analyse de votre question en cours...
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-3 bg-gray-100 rounded-full w-5/6 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-full w-4/6 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded-full w-3/6 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current AI Response Section */}
      <AnimatePresence>
        {currentAiResponse && !isAiLoading && (
          <motion.div
            ref={responseCardRef}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-rose-200/80 rounded-2xl p-4.5 shadow-sm space-y-3.5 relative"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-[13px] font-bold text-black">
                  Réponse de l'Assistant Bavel
                </span>
              </div>
              {currentAiResponse.category && (
                <span className="text-[10.5px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                  {currentAiResponse.category}
                </span>
              )}
            </div>

            {/* User Asked Question */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[12.5px] font-semibold text-gray-700 flex items-start space-x-2">
              <span className="text-gray-400 shrink-0 mt-0.5">❓</span>
              <span className="line-clamp-2">« {currentAiResponse.question} »</span>
            </div>

            {/* AI Formatted Response Content */}
            <div className="pt-0.5">
              {renderFormattedAnswer(currentAiResponse.answer)}
            </div>

            {/* Quick Action Button if provided */}
            {currentAiResponse.action && (
              <div className="pt-1">
                <button
                  onClick={() => onActionTrigger?.(currentAiResponse.action?.type || 'general')}
                  className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-[13px] rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <span>{currentAiResponse.action.label}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            )}

            {/* Suggested Follow-up Questions */}
            {currentAiResponse.suggestedQuestions && currentAiResponse.suggestedQuestions.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block">
                  Questions suggérées :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentAiResponse.suggestedQuestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleAskAi(sug)}
                      className="text-left text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-rose-50 hover:text-rose-600 border border-gray-100 hover:border-rose-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="line-clamp-1">{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Bar */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11.5px] text-gray-500">
              <span>Cette réponse vous a-t-elle aidé ?</span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleFeedback('yes')}
                  disabled={feedbackGiven !== null}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                    feedbackGiven === 'yes'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>Oui</span>
                </button>
                <button
                  onClick={() => handleFeedback('no')}
                  disabled={feedbackGiven !== null}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                    feedbackGiven === 'no'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span>Non</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Curated Interactive FAQ Accordion */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[13.5px] font-extrabold text-black tracking-tight">
            Questions Fréquentes {selectedCategory !== 'all' ? `(${filteredFaqs.length})` : 'Populaires'}
          </h4>
          {currentAiResponse && (
            <button
              onClick={() => {
                setCurrentAiResponse(null);
                setSearchQuery('');
              }}
              className="text-[11.5px] font-bold text-gray-400 hover:text-black cursor-pointer"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-2">
            <Info className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-[13px] font-semibold text-gray-700">
              Aucune question préenregistrée trouvée pour cette recherche.
            </p>
            <button
              onClick={() => handleAskAi(searchQuery)}
              className="px-4 py-2 bg-rose-500 text-white font-bold text-[12.5px] rounded-full hover:bg-rose-600 transition-colors cursor-pointer"
            >
              Demander au Support
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start space-x-2.5 pr-2">
                      {faq.popular && (
                        <span className="text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded-md shrink-0 mt-0.5">
                          TOP
                        </span>
                      )}
                      <span className="text-[13.5px] font-bold text-black leading-snug">
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-rose-500' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-3"
                      >
                        {renderFormattedAnswer(faq.quickAnswer)}

                        <div className="flex items-center justify-between pt-1 border-t border-gray-100/80">
                          <button
                            onClick={() => handleAskAi(faq.question)}
                            className="text-[11.5px] font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>En savoir plus</span>
                          </button>
                          
                          <span className="text-[11px] text-gray-400">Base Bavel v4</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast Feedback confirmation */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-lg z-[250] flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Merci pour votre retour !</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
