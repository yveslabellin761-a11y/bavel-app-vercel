import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowLeft, Calendar, ChevronRight, ChevronLeft, MessageCircle, Heart, Coffee, RefreshCw, Ruler, Check, ChevronDown, ChevronUp, X, Image as ImageIcon, Camera, Sparkles, Plus, Info, AlertCircle, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { aiSystemEngine } from '../../services/aiSystemEngine';
import { completeOnboardingInSupabase, hasUserCompletedQuiz } from '../../lib/supabase';
import { parseProfileLocation } from '../../lib/locationProfile';
import { WORLD_LOCATIONS } from '../../data/worldCities';
import { authFetch } from '../../lib/authFetch';
import { getApiUrl } from '../../lib/apiUrl';

interface RegisterWizardProps {
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  onComplete: (data: { 
    name: string; 
    gender: string; 
    birthday: string; 
    email?: string; 
    phone?: string; 
    purpose?: string; 
    city?: string;
    location?: string;
    country?: string;
    countryCode?: string;
    locationSource?: 'manual' | 'gps';
    latitude?: number;
    longitude?: number;
    photos?: string[];
    avatarUrl?: string;
    sexualOrientation?: string; 
    relationshipStatus?: string; 
    bio?: string;
    height?: string;
    school?: string;
    jobTitle?: string;
    company?: string;
    drinking?: string;
    smoking?: string;
    kids?: string;
    educationLevel?: string;
    personality?: string;
    interests?: string[];
    pets?: string;
    starSign?: string;
    religion?: string;
    languages?: string;
    prompt1Question?: string;
    prompt1Answer?: string;
    prompt2Question?: string;
    prompt2Answer?: string;
    prompt3Question?: string;
    prompt3Answer?: string;
  }) => void | Promise<void>;
  onBack: () => void;
}

const SUGGESTED_CITIES = WORLD_LOCATIONS.map(location => location.fullName);

const QUIZ_STEPS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 21.5, 22];

const getQuizProgressPercentage = (currentStep: number) => {
  const index = QUIZ_STEPS.indexOf(currentStep);
  if (index === -1) {
    if (currentStep < 4) return 0;
    return 100;
  }
  return Math.round(((index + 1) / QUIZ_STEPS.length) * 100);
};

const QuizProgressIndicator = ({ step }: { step: number }) => {
  const stepIndex = QUIZ_STEPS.indexOf(step);
  const progress = getQuizProgressPercentage(step);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      role="progressbar"
      aria-label="Progression du quiz"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-valuetext={stepIndex >= 0 ? `Étape ${stepIndex + 1} sur ${QUIZ_STEPS.length}` : `${progress}%`}
      className="flex-1 min-w-0 h-[4px] bg-gray-100 rounded-full overflow-hidden relative"
    >
      <motion.div
        className="h-full bg-black rounded-full"
        animate={{ width: `${progress}%` }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
      />
    </div>
  );
};

const PROMPT_QUESTIONS = [
  "Qu'est-ce que vous appréciez le plus chez un partenaire ?",
  "Comment votre meilleur(e) ami(e) vous décrirait-il/elle ?",
  "Sur quoi devons-nous être sur la même longueur d'onde ?",
  "Qu'est-ce qui vous impressionne ?",
  "Quelle est votre qualité préférée chez vous ?",
  "Qu'essayez-vous encore de comprendre ?",
  "Si vous deviez choisir une seule fête, ce serait laquelle ?",
  "Qu'est-ce que vous gardez toujours dans votre voiture ?",
  "Que doit-on savoir sur vous avant de sortir ensemble ?",
  "Le meilleur endroit pour un rendez-vous cinéma ?",
  "Que recherchez-vous ?",
  "Quel est votre plus grand critère rédhibitoire ?",
  "Quel est le métier de vos rêves ?",
  "À quoi ressemble l'amour selon vous ?",
  "Comment aimez-vous passer vos week-ends ?",
  "Qu'est-ce qui vous fait rire ?",
  "À quoi ressemble la vie de vos rêves ?",
  "Quelle est la chose incontournable sur votre liste de souhaits ?",
  "Quelle est la cause qui vous tient particulièrement à cœur ?",
  "Quel est votre genre de musique préféré ?",
  "Quel est votre premier rendez-vous idéal ?",
  "Que pensez-vous de l'astrologie ?",
  "Qu'est-ce que les gens devraient savoir sur vous ?",
  "De quoi êtes-vous le/la plus fier(e) ?",
  "Qu'essayez-vous d'apprendre en ce moment ?",
  "Quel est votre objectif amoureux cette année ?",
  "Comment prenez-vous soin de vous ?",
  "À quoi ressembliez-vous au lycée ?",
  "Quel est votre avis sur la monogamie ?"
];

export function RegisterWizard({ 
  initialName = '', 
  initialEmail = '', 
  initialPhone = '', 
  onComplete, 
  onBack 
}: RegisterWizardProps) {
  // Step State (We start at Step 1, "Etape 1")
  const [step, setStep] = useState<number>(1);
  const [tookQuiz, setTookQuiz] = useState<boolean>(false);
  
  // Etape 1 Form States
  const [gender, setGender] = useState<'female' | 'male' | 'more' | ''>('male');
  const [lookingFor, setLookingFor] = useState<'male' | 'female' | 'both'>('female');
  const [userAge, setUserAge] = useState<number>(24);
  const [showAgePickerModal, setShowAgePickerModal] = useState<boolean>(false);
  const [name, setName] = useState<string>((initialName && initialName !== 'Membre' && initialName !== 'Guest') ? initialName : '');
  const [birthday, setBirthday] = useState('');
  
  // Etape 2 Form States
  const [purpose, setPurpose] = useState<'date' | 'chat' | 'relationship' | ''>('');

  // Etape 3.1 Location Form States
  const [userLocation, setUserLocation] = useState<string>('');
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLon, setUserLon] = useState<number | undefined>();
  const [locationSource, setLocationSource] = useState<'manual' | 'gps'>('manual');
  const [isFetchingGps, setIsFetchingGps] = useState<boolean>(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState<boolean>(false);

  // Etape 3.2 Photos & Congratulation States
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [showCongratsModal, setShowCongratsModal] = useState<boolean>(false);
  const [activePhotoSlot, setActivePhotoSlot] = useState<number | null>(null);
  const [photoDuplicateError, setPhotoDuplicateError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isCheckingNsfw, setIsCheckingNsfw] = useState(false);

  const addPhotoToSlot = async (photoUrl: string) => {
    // Check if duplicate photo
    const isDuplicate = userPhotos.some((p, index) => {
      if (activePhotoSlot !== null && index === activePhotoSlot) return false;
      return p && p === photoUrl;
    });

    if (isDuplicate) {
      setPhotoDuplicateError("Les 2 photos doivent être différentes. Vous avez déjà choisi cette même photo.");
      setShowPhotoModal(false);
      setActivePhotoSlot(null);
      return;
    }

    // NSFW Check for uploaded files (base64)
    if (photoUrl.startsWith('data:image/')) {
      setIsCheckingNsfw(true);
      try {
        const response = await authFetch('/api/check-nsfw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: photoUrl })
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Le contrôle de sécurité des images est indisponible.');
        }
        if (!data.isSafe) {
          setPhotoDuplicateError(data.message || "L'image contient du contenu inapproprié (NSFW).");
          setShowPhotoModal(false);
          setActivePhotoSlot(null);
          return;
        }
      } catch (error) {
        console.error('Contrôle de sécurité photo indisponible:', error);
        setPhotoDuplicateError(
          error instanceof Error
            ? `${error.message} La photo n’a pas été ajoutée.`
            : 'Le contrôle de sécurité est indisponible. La photo n’a pas été ajoutée.'
        );
        setShowPhotoModal(false);
        setActivePhotoSlot(null);
        return;
      } finally {
        setIsCheckingNsfw(false);
      }
    }

    setPhotoDuplicateError(null);
    setUserPhotos(prev => {
      const copy = [...prev];
      if (activePhotoSlot !== null && activePhotoSlot < 2) {
        copy[activePhotoSlot] = photoUrl;
      } else {
        copy.push(photoUrl);
      }
      return copy.slice(0, 2);
    });
    setShowPhotoModal(false);
    setActivePhotoSlot(null);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          addPhotoToSlot(result);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleFinalizeAndEnterApp = () => {
    const selectedOrientationLabel = orientationOptions.find(o => o.id === sexualOrientation)?.label || 'Je préfère ne pas le dire';
    const selectedRelationshipLabel = relationshipOptions.find(o => o.id === relationshipStatus)?.label || 'Je préfère ne pas le dire';
    const selectedDrinkingLabel = drinkingOptions.find(o => o.id === drinking)?.label || 'Je préfère ne pas le dire';
    const selectedSmokingLabel = smokingOptions.find(o => o.id === smoking)?.label || 'Je préfère ne pas le dire';
    const selectedKidsLabel = kidsOptions.find(o => o.id === kids)?.label || 'Je préfère ne pas le dire';
    const selectedEducationLabel = educationLevelOptions.find(o => o.id === educationLevel)?.label || 'Je préfère ne pas le dire';
    const selectedPersonalityLabel = personalityOptions.find(o => o.id === personality)?.label || 'Je préfère ne pas le dire';
    const selectedPetsLabel = petsOptions.find(o => o.id === pets)?.label || 'Je préfère ne pas le dire';
    const selectedStarSignLabel = starSignOptions.find(o => o.id === starSign)?.label || 'I\'d rather not say';
    const selectedReligionLabel = religionOptions.find(o => o.id === religion)?.label || 'I\'d rather not say';
    const heightStr = heightNotSay ? 'Je préfère ne pas le dire' : (isCm ? `${heightValue} cm` : formatFeetInches(heightValue));
    const finalCity = userLocation ? userLocation.split(',')[0].trim() : undefined;
    const parsedLocation = parseProfileLocation(userLocation);

    onComplete({
      name: name.trim() || 'Mon Profil',
      gender: gender === 'more' ? (customGender || 'Autre') : (gender === 'female' ? 'Femme' : 'Homme'),
      birthday: birthday,
      email: initialEmail || undefined,
      phone: initialPhone || undefined,
      purpose: purpose === 'date' ? 'Faire des rencontres' : purpose === 'chat' ? 'Discuter' : 'Relation sérieuse',
      city: finalCity,
      location: userLocation.trim() || undefined,
      country: parsedLocation.country || undefined,
      countryCode: parsedLocation.countryCode,
      locationSource,
      latitude: userLat,
      longitude: userLon,
      photos: userPhotos,
      avatarUrl: userPhotos[0] || '',
      sexualOrientation: selectedOrientationLabel,
      relationshipStatus: selectedRelationshipLabel,
      bio: bio.trim(),
      height: heightStr,
      school: school.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      company: company.trim() || undefined,
      drinking: selectedDrinkingLabel,
      smoking: selectedSmokingLabel,
      kids: selectedKidsLabel,
      educationLevel: selectedEducationLabel,
      personality: selectedPersonalityLabel,
      interests: interests.length > 0 ? interests : undefined,
      pets: selectedPetsLabel,
      starSign: selectedStarSignLabel,
      religion: selectedReligionLabel,
      prompt1Question: prompt1Question || undefined,
      prompt1Answer: prompt1Answer || undefined,
      prompt2Question: prompt2Question || undefined,
      prompt2Answer: prompt2Answer || undefined,
      prompt3Question: prompt3Question || undefined,
      prompt3Answer: prompt3Answer || undefined
    });
  };

  // Etape 4 Form States (Quiz Sexual Orientation)
  const [sexualOrientation, setSexualOrientation] = useState<string>('not_say');

  // Etape 5 Form States (Quiz Relationship Status)
  const [relationshipStatus, setRelationshipStatus] = useState<string>('not_say');

  // Etape 6 Form States (Quiz Bio)
  const [bio, setBio] = useState<string>('');

  // Etape 7 Form States (Quiz Height / Taille - Volet 4)
  const [heightValue, setHeightValue] = useState<number>(170); // default to 170cm
  const [heightNotSay, setHeightNotSay] = useState<boolean>(true); // initially "Je préfère ne pas le dire"
  const [isCm, setIsCm] = useState<boolean>(true); // unit toggle

  // Etape 8 Form States (Quiz School / Études - Volet 5)
  const [school, setSchool] = useState<string>('');

  // Etape 9 Form States (Quiz Work / Emploi - Volet 6)
  const [jobTitle, setJobTitle] = useState<string>('');
  const [company, setCompany] = useState<string>('');

  // Etape 10 Form States (Quiz Drinking - Volet 7)
  const [drinking, setDrinking] = useState<string>('not_say');

  // Etape 11 Form States (Quiz Smoking - Volet 8)
  const [smoking, setSmoking] = useState<string>('not_say');

  // Etape 12 Form States (Quiz Kids - Volet 9)
  const [kids, setKids] = useState<string>('not_say');

  // Etape 13 Form States (Quiz Education - Volet 10)
  const [educationLevel, setEducationLevel] = useState<string>('not_say');

  // Etape 14 Form States (Quiz Personality - Volet 11)
  const [personality, setPersonality] = useState<string>('not_say');

  // Etape 15 Form States (Quiz Interests - Volet 12)
  const [interests, setInterests] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Etape 16 Form States (Quiz Pets - Volet 13)
  const [pets, setPets] = useState<string>('not_say');

  // Etape 17 Form States (Quiz Star Sign - Volet 14)
  const [starSign, setStarSign] = useState<string>('not_say');

  // Etape 18 Form States (Quiz Religion - Volet 15)
  const [religion, setReligion] = useState<string>('not_say');

  // Etape Languages Form States (Quiz Languages)
  const [languages, setLanguages] = useState<string[]>(['fr']);
  
  // Prompt questions and answers states
  const [prompt1Question, setPrompt1Question] = useState<string>('');
  const [prompt1Answer, setPrompt1Answer] = useState<string>('');
  const [prompt2Question, setPrompt2Question] = useState<string>('');
  const [prompt2Answer, setPrompt2Answer] = useState<string>('');
  const [prompt3Question, setPrompt3Question] = useState<string>('');
  const [prompt3Answer, setPrompt3Answer] = useState<string>('');
  
  // Local active prompt answering state
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [selectedPromptOption, setSelectedPromptOption] = useState<string>('');
  const [customPromptAnswer, setCustomPromptAnswer] = useState<string>('');
  const [tempAnswerText, setTempAnswerText] = useState<string>('');
  
  // Custom Gender Choices Modal/Drawer (for "More Choices")
  const [showMoreChoices, setShowMoreChoices] = useState(false);
  const [customGender, setCustomGender] = useState('');
  const [tempSelectedGender, setTempSelectedGender] = useState<string>('Non-binaire');

  // Photo Verification & Native Camera Trigger
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoVerified, setPhotoVerified] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [verificationErrorMsg, setVerificationErrorMsg] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; text: string } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Trigger native device camera input directly (Android / iOS native camera app)
  const triggerNativeCamera = () => {
    setVerificationFailed(true);
    setVerificationErrorMsg('La vérification photo est indisponible. Aucun selfie ne sera demandé.');
  };

  // Web camera fallback for desktop browsers
  const startWebCamera = async () => {
    setShowLiveCamera(true);
    setCameraError(null);
    setCapturedPhotoUrl(null);
    setPhotoVerified(false);
    setVerificationFailed(false);
    setVerificationErrorMsg(null);
    setIsTakingPhoto(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Impossible d'accéder à l'appareil photo. Veuillez utiliser l'importation de fichiers.");
    }
  };

  const retakePhoto = () => {
    setCapturedPhotoUrl(null);
    setVerificationFailed(false);
    setVerificationErrorMsg(null);
    setPhotoVerified(false);
    setIsTakingPhoto(false);
    
    // Launch native phone camera trigger directly again
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      startWebCamera();
    }
  };

  const handleSnapPhoto = () => {
    if (!videoRef.current && !capturedPhotoUrl) return;
    
    let photoDataUrl = capturedPhotoUrl;
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedPhotoUrl(photoDataUrl);
      }
    }

    processVerification(photoDataUrl || undefined);
  };

  const processVerification = async (dataUrl?: string) => {
    void dataUrl;
    setIsTakingPhoto(false);
    setPhotoVerified(false);
    setVerificationFailed(true);
    setVerificationErrorMsg('La vérification photo est indisponible. Aucun selfie n’a été transmis.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedPhotoUrl(dataUrl);
        stopCamera();
        processVerification(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    if (showLiveCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [showLiveCamera, cameraStream]);

  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraStream]);
  
  // Validation Errors State
  const [errors, setErrors] = useState<{ gender?: string; name?: string; birthday?: string }>({});

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Parse age from date of birth
  const getAge = (birthDateString: string) => {
    if (!birthDateString) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Localized date formatting matching screenshot: "5 juil. 1983"
  const formatFrenchDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate();
    const monthsShort = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const month = monthsShort[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  const formatFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  // Validation before proceeding from Step 1 to Step 2
  const handleContinueStep1 = () => {
    const newErrors: { gender?: string; name?: string; birthday?: string } = {};
    
    // Ensure gender is set
    if (!gender) {
      setGender('male');
    }
    
    // Auto populate birthday from userAge if not set explicitly
    if (!birthday) {
      const calculatedYear = new Date().getFullYear() - (userAge || 24);
      setBirthday(`${calculatedYear}-06-15`);
    } else {
      const age = getAge(birthday);
      if (age < 18) {
        newErrors.birthday = 'Vous devez avoir au moins 18 ans pour vous inscrire';
      }
    }

    if (!name.trim()) {
      newErrors.name = 'Veuillez saisir votre prénom';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Votre prénom doit contenir au moins 2 caractères';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(2); // Move to Step 2
  };

  // Proceed from Step 2 to Step 3
  const handleCompleteStep2 = () => {
    if (!purpose) return;
    setStep(3); // Move to Step 3 (The Quiz Prompt)
  };

  // Submit everything from Step 3 or proceed to Step 4 / Step 3.1
  const handleCompleteWizard = (startQuiz: boolean) => {
    setTookQuiz(startQuiz);
    if (startQuiz) {
      setStep(4); // Move to Step 4 (Quiz Orientation)
    } else {
      setStep(3.1); // Move to Step 3.1 (Location screen)
    }
  };

  const orientationOptions = [
    { id: 'straight', label: 'Hétérosexuel(le)' },
    { id: 'gay', label: 'Gay' },
    { id: 'lesbian', label: 'Lesbienne' },
    { id: 'bisexual', label: 'Bisexuel(le)' },
    { id: 'asexual', label: 'Asexuel(le)' },
    { id: 'demisexual', label: 'Démisexuel(le)' },
    { id: 'pansexual', label: 'Pansexuel(le)' },
    { id: 'queer', label: 'Queer' },
    { id: 'questioning', label: 'En questionnement' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  // Move from Step 4 to Step 5
  const handleSubmitQuiz = () => {
    setStep(5);
  };

  const relationshipOptions = [
    { id: 'single', label: 'Célibataire' },
    { id: 'taken', label: 'En couple' },
    { id: 'complicated', label: "C'est compliqué" },
    { id: 'open', label: 'Relation libre' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const drinkingOptions = [
    { id: 'socially', label: 'À l\'occasion' },
    { id: 'never', label: 'Jamais' },
    { id: 'often', label: 'Souvent' },
    { id: 'sober', label: 'Non, je suis sobre' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const smokingOptions = [
    { id: 'yes', label: 'Oui' },
    { id: 'no', label: 'Non' },
    { id: 'sometimes', label: 'Parfois' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const kidsOptions = [
    { id: 'someday', label: 'J\'en voudrais un jour' },
    { id: 'soon', label: 'J\'en voudrais bientôt' },
    { id: 'dont_want', label: 'Je ne veux pas d\'enfants' },
    { id: 'have_kids', label: 'J\'ai déjà des enfants' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const educationLevelOptions = [
    { id: 'high_school', label: 'Lycée' },
    { id: 'graduate', label: 'Diplôme universitaire' },
    { id: 'in_grad_school', label: 'En études supérieures' },
    { id: 'in_college', label: 'À l\'université' },
    { id: 'undergrad', label: 'Licence/Bachelor' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const personalityOptions = [
    { id: 'introvert', label: 'Introverti' },
    { id: 'extrovert', label: 'Extraverti' },
    { id: 'in_between', label: 'Un peu des deux' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const petsOptions = [
    { id: 'cat', label: 'Chat(s)' },
    { id: 'dog', label: 'Chien(s)' },
    { id: 'cat_dog', label: 'Chats et chiens' },
    { id: 'other', label: 'Autres' },
    { id: 'no_pets', label: 'Pas d\'animaux' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const starSignOptions = [
    { id: 'aries', label: 'Bélier' },
    { id: 'taurus', label: 'Taureau' },
    { id: 'gemeaux', label: 'Gémeaux' },
    { id: 'cancer', label: 'Cancer' },
    { id: 'leo', label: 'Lion' },
    { id: 'virgo', label: 'Vierge' },
    { id: 'libra', label: 'Balance' },
    { id: 'scorpio', label: 'Scorpion' },
    { id: 'sagittarius', label: 'Sagittaire' },
    { id: 'capricorn', label: 'Capricorne' },
    { id: 'aquarius', label: 'Verseau' },
    { id: 'pisces', label: 'Poissons' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const religionOptions = [
    { id: 'agnostic', label: 'Agnostique' },
    { id: 'atheist', label: 'Athée' },
    { id: 'buddhist', label: 'Bouddhiste' },
    { id: 'catholic', label: 'Catholique' },
    { id: 'christian', label: 'Chrétien(ne)' },
    { id: 'hindu', label: 'Hindou(e)' },
    { id: 'jain', label: 'Jaïne' },
    { id: 'jewish', label: 'Juif / Juive' },
    { id: 'mormon', label: 'Mormon(e)' },
    { id: 'muslim', label: 'Musulman(e)' },
    { id: 'zoroastrian', label: 'Zoroastrien(ne)' },
    { id: 'sikh', label: 'Sikh' },
    { id: 'spiritual', label: 'Spirituel(le)' },
    { id: 'other', label: 'Autre' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const languagesOptions = [
    { id: 'en', label: 'Anglais' },
    { id: 'fr', label: 'Français' },
    { id: 'de', label: 'Allemand' },
    { id: 'es', label: 'Espagnol' },
    { id: 'it', label: 'Italien' },
    { id: 'pt', label: 'Portugais' },
    { id: 'ru', label: 'Russe' },
    { id: 'zh', label: 'Chinois' },
    { id: 'af', label: 'Afrikaans' },
    { id: 'id', label: 'Indonésien' },
    { id: 'bs', label: 'Bosniaque' },
    { id: 'ca', label: 'Catalan' },
    { id: 'cs', label: 'Tchèque' },
    { id: 'not_say', label: 'Je préfère ne pas le dire' }
  ];

  const INTERESTS_CATEGORIES = [
    {
      title: "Divertissements",
      items: [
        { label: "Jeux de société", emoji: "🎲" },
        { label: "Bowling", emoji: "🎳" },
        { label: "Jeux de cartes", emoji: "♠️" },
        { label: "Cosplay", emoji: "🧚" },
        { label: "Comédies musicales", emoji: "🎼" },
        { label: "Organisation de fêtes", emoji: "🎈" },
        { label: "Podcasts", emoji: "🎙️" },
        { label: "Puzzles", emoji: "🧩" },
        { label: "Billard", emoji: "🎱" },
        { label: "Clubs de comédie", emoji: "🎭" },
        { label: "Escape games", emoji: "🚪" },
        { label: "Soirées quiz", emoji: "❓" },
        { label: "Jeux vidéo", emoji: "🎮" }
      ]
    },
    {
      title: "Films & Séries",
      items: [
        { label: "Films d'action", emoji: "🤸" },
        { label: "Films d'animation", emoji: "✏️" },
        { label: "Animes", emoji: "💥" },
        { label: "Bollywood", emoji: "🇮🇳" },
        { label: "Dessins animés", emoji: "🤠" },
        { label: "Émissions de cuisine", emoji: "🍳" },
        { label: "Documentaires", emoji: "🎥" },
        { label: "Films fantastiques", emoji: "🐉" },
        { label: "Films d'horreur", emoji: "👻" },
        { label: "K-Drama", emoji: "🇰🇷" },
        { label: "Science-fiction", emoji: "👽" },
        { label: "True crime", emoji: "🕵️" },
        { label: "Films indépendants", emoji: "🎬" }
      ]
    },
    {
      title: "Gastronomie & Boissons",
      items: [
        { label: "Pâtisserie", emoji: "🍰" },
        { label: "Barbecues", emoji: "🍖" },
        { label: "Bière", emoji: "🍺" },
        { label: "Bubble tea", emoji: "🧋" },
        { label: "Chocolat", emoji: "🍫" },
        { label: "Cocktails", emoji: "🍹" },
        { label: "Amateur de café", emoji: "☕" },
        { label: "Cuisine", emoji: "🥘" },
        { label: "Gastronomie", emoji: "🍷" },
        { label: "Street food", emoji: "🌮" },
        { label: "Amateur de sushis", emoji: "🍣" },
        { label: "Cuisine végane", emoji: "🥗" },
        { label: "Dégustation de vin", emoji: "🍷" }
      ]
    },
    {
      title: "Sorties & Soirées",
      items: [
        { label: "Bars", emoji: "🥂" },
        { label: "Brunch à volonté", emoji: "🍾" },
        { label: "Boîtes de nuit", emoji: "🔊" },
        { label: "Salons de thé & cafés", emoji: "☕" },
        { label: "Concerts", emoji: "🎫" },
        { label: "Rencontres", emoji: "🍴" },
        { label: "Dîner entre amis", emoji: "🍜" },
        { label: "Drag shows", emoji: "👠" },
        { label: "Festivals", emoji: "🎪" },
        { label: "Karaoké", emoji: "🎤" },
        { label: "Marchés nocturnes", emoji: "🏮" },
        { label: "Raves", emoji: "⚡" },
        { label: "Tournée des bars", emoji: "🍻" }
      ]
    },
    {
      title: "Style de vie",
      items: [
        { label: "Amoureux des animaux", emoji: "🐱" },
        { label: "Amateur d'art", emoji: "🎨" },
        { label: "Astrologie", emoji: "⭐" },
        { label: "Chasseur de bonnes affaires", emoji: "💰" },
        { label: "Cristaux", emoji: "🔮" },
        { label: "Câlins & tendresse", emoji: "💕" },
        { label: "Poursuite des rêves", emoji: "💭" },
        { label: "Raver passionné", emoji: "🤘" },
        { label: "Minimalisme", emoji: "🪴" },
        { label: "Mode de vie doux", emoji: "🐌" },
        { label: "Van life", emoji: "🚐" },
        { label: "Friperie & vintage", emoji: "🧥" },
        { label: "Zéro déchet", emoji: "♻️" }
      ]
    },
    {
      title: "Musique",
      items: [
        { label: "Afrobeats", emoji: "🥁" },
        { label: "Musique classique", emoji: "🎹" },
        { label: "Country", emoji: "🪕" },
        { label: "Musique dance", emoji: "🎉" },
        { label: "Desi", emoji: "🪕" },
        { label: "Disco", emoji: "🕺" },
        { label: "DJing", emoji: "🎛️" },
        { label: "EDM", emoji: "🤖" },
        { label: "Hip Hop", emoji: "🎤" },
        { label: "Jazz", emoji: "🎷" },
        { label: "Metal", emoji: "🎸" },
        { label: "Pop", emoji: "🎵" },
        { label: "Rock", emoji: "🎸" }
      ]
    },
    {
      title: "Lecture & Livres",
      items: [
        { label: "Dévoreur de livres", emoji: "📚" },
        { label: "Biographies", emoji: "📖" },
        { label: "Clubs de lecture", emoji: "🔖" },
        { label: "Littérature classique", emoji: "🕯️" },
        { label: "Bandes dessinées", emoji: "💥" },
        { label: "Livres fantastiques", emoji: "🐉" },
        { label: "Livres humoristiques", emoji: "😆" },
        { label: "Romans historiques", emoji: "🎩" },
        { label: "Manga", emoji: "📚" },
        { label: "Romans policiers", emoji: "🔍" },
        { label: "Poésie", emoji: "✒️" },
        { label: "Science-fiction", emoji: "🚀" },
        { label: "Développement personnel", emoji: "💡" }
      ]
    },
    {
      title: "Bien-être",
      items: [
        { label: "Aromathérapie", emoji: "🧴" },
        { label: "Journal intime", emoji: "🖊️" },
        { label: "Méditation", emoji: "🧘" },
        { label: "Pleine conscience", emoji: "☁️" },
        { label: "Relaxation", emoji: "🛋️" },
        { label: "Soins personnels", emoji: "🛁" },
        { label: "Soins de la peau", emoji: "🌞" },
        { label: "Journée spa", emoji: "🧖" },
        { label: "Thérapie", emoji: "💬" }
      ]
    },
    {
      title: "Loisirs & Passions",
      items: [
        { label: "Théâtre", emoji: "🎭" },
        { label: "Loisirs créatifs", emoji: "✂️" },
        { label: "Astronomie", emoji: "🌌" },
        { label: "Danse", emoji: "💃" },
        { label: "Observation des oiseaux", emoji: "🦅" },
        { label: "Blogging", emoji: "💻" },
        { label: "Chimie", emoji: "🧪" },
        { label: "Jeu d'échecs", emoji: "♟️" },
        { label: "Jardinage", emoji: "🪴" },
        { label: "Photographie", emoji: "📷" },
        { label: "Poterie", emoji: "🏺" },
        { label: "Couture", emoji: "🪡" },
        { label: "Écriture", emoji: "✍️" }
      ]
    },
    {
      title: "Sports & Forme",
      items: [
        { label: "Athlétisme", emoji: "🏃" },
        { label: "Badminton", emoji: "🏸" },
        { label: "Baseball", emoji: "⚾" },
        { label: "Basketball", emoji: "🏀" },
        { label: "Musculation", emoji: "🏋️" },
        { label: "Boxe", emoji: "🥊" },
        { label: "Cardio", emoji: "🏃" },
        { label: "Cricket", emoji: "🏏" },
        { label: "Escalade", emoji: "🧗" },
        { label: "Cyclisme", emoji: "🚴" },
        { label: "Football", emoji: "⚽" },
        { label: "Surf", emoji: "🏄" },
        { label: "Yoga", emoji: "🧘" }
      ]
    },
    {
      title: "Technologie",
      items: [
        { label: "Impression 3D", emoji: "🖨️" },
        { label: "Tech & Digital", emoji: "🧠" },
        { label: "Électronique", emoji: "🖥️" },
        { label: "Programmation", emoji: "💻" },
        { label: "Robotique", emoji: "🦾" },
        { label: "Passionné de tech", emoji: "📱" },
        { label: "Réalité Virtuelle", emoji: "😎" }
      ]
    },
    {
      title: "Voyages",
      items: [
        { label: "Aventure", emoji: "🏔️" },
        { label: "Vacances à la plage", emoji: "🏖️" },
        { label: "Croisières", emoji: "🛳️" },
        { label: "Camping", emoji: "🏕️" },
        { label: "Voyageur sans souci", emoji: "🌎" },
        { label: "Exploration urbaine", emoji: "🔎" },
        { label: "Échappées à la campagne", emoji: "🌳" },
        { label: "Jet-setter", emoji: "✈️" },
        { label: "Voyage en sac à dos", emoji: "🎒" },
        { label: "Road trips", emoji: "🚗" },
        { label: "Voyages en solo", emoji: "🚶" },
        { label: "Séjours locaux", emoji: "🏨" }
      ]
    },
    {
      title: "Valeurs & Engagements",
      items: [
        { label: "Black Lives Matter", emoji: "🖤" },
        { label: "Body positivity", emoji: "👏" },
        { label: "Écologie & Environnement", emoji: "🌿" },
        { label: "Féminisme", emoji: "💜" },
        { label: "Droits humains", emoji: "✊" },
        { label: "Droits LGBTQIA+", emoji: "🏳️‍🌈" },
        { label: "Stop Asian Hate", emoji: "🚫" },
        { label: "Durabilité", emoji: "♻️" },
        { label: "Droits des personnes trans", emoji: "💖" },
        { label: "Bénévolat", emoji: "🙋" }
      ]
    }
  ];

  const PROMPT_QUESTIONS_LIST = [
    "Qu'est-ce que vous appréciez le plus chez un partenaire ?",
    "Comment votre meilleur(e) ami(e) vous décrirait-il/elle ?",
    "Sur quoi devons-nous être sur la même longueur d'onde ?",
    "Qu'est-ce qui vous impressionne ?",
    "Quelle est votre qualité préférée chez vous ?",
    "Qu'essayez-vous encore de comprendre ?",
    "Si vous deviez choisir une seule fête, ce serait laquelle ?",
    "Qu'est-ce que vous gardez toujours dans votre voiture ?",
    "Que doit-on savoir sur vous avant de sortir ensemble ?",
    "Le meilleur endroit pour un rendez-vous cinéma ?",
    "Que recherchez-vous ?",
    "Quel est votre plus grand critère rédhibitoire ?",
    "Quel est le métier de vos rêves ?",
    "À quoi ressemble l'amour selon vous ?",
    "Comment aimez-vous passer vos week-ends ?",
    "Qu'est-ce qui vous fait rire ?",
    "À quoi ressemble la vie de vos rêves ?",
    "Quelle est la chose incontournable sur votre liste de souhaits ?",
    "Quelle est la cause qui vous tient particulièrement à cœur ?",
    "Quel est votre genre de musique préféré ?",
    "Quel est votre premier rendez-vous idéal ?",
    "Que pensez-vous de l'astrologie ?",
    "Qu'est-ce que les gens devraient savoir sur vous ?",
    "De quoi êtes-vous le/la plus fier(e) ?",
    "Qu'essayez-vous d'apprendre en ce moment ?",
    "Quel est votre objectif amoureux cette année ?",
    "Comment prenez-vous soin de vous ?",
    "À quoi ressembliez-vous au lycée ?",
    "Quel est votre avis sur la monogamie ?",
    "Au cinéma, que regardez-vous ?",
    "Quelle est votre façon préférée de passer un week-end ?",
    "Quel est votre sport préféré à regarder ?"
  ];

  const PROMPT_OPTIONS_MAP: Record<string, string[]> = {
    "Qu'est-ce que vous appréciez le plus chez un partenaire ?": [
      "Proche de sa famille",
      "Qui soutient mes projets et mes rêves",
      "Toujours partant(e) pour l'aventure",
      "Une excellente communication",
      "Honnête, mais bienveillant(e)"
    ],
    "Comment votre meilleur(e) ami(e) vous décrirait-il/elle ?": [
      "L'âme de la fête",
      "Toujours en avance",
      "Hyper attentionné(e)",
      "Un vrai cordon bleu",
      "Un(e) spécialiste pour résoudre les problèmes"
    ],
    "Sur quoi devons-nous être sur la même longueur d'onde ?": [
      "La vision politique",
      "L'importance de la famille",
      "Ce que nous recherchons ici",
      "Le super-pouvoir idéal",
      "Les projets à 5 ans"
    ],
    "Qu'est-ce qui vous impressionne ?": [
      "Être suivi(e) en thérapie",
      "La régularité à la salle de sport",
      "Un vrai talent culinaire maison",
      "De super recommandations de bars",
      "La bienveillance au quotidien"
    ],
    "Quelle est votre qualité préférée chez vous ?": [
      "Mon excellent goût musical",
      "Ma capacité à te faire rire",
      "Ma loyauté sans faille",
      "Mon côté spirituel",
      "Mon attachement à mes proches"
    ],
    "Qu'essayez-vous encore de comprendre ?": [
      "Mon plan de carrière",
      "Où je veux m'installer à long terme",
      "Comment équilibrer travail et vie perso",
      "Mes objectifs relationnels",
      "Mes prochaines étapes de vie"
    ],
    "Si vous deviez choisir une seule fête, ce serait laquelle ?": [
      "Noël & le Nouvel An",
      "Vacances d'été à la plage",
      "Halloween",
      "Les grands repas de famille",
      "Un week-end d'évasion en ville"
    ],
    "Qu'est-ce que vous gardez toujours dans votre voiture ?": [
      "Une réserve de snacks d'urgence",
      "Beaucoup trop de lunettes de soleil",
      "Un sac de sport complet",
      "Une playlist pour chaque humeur",
      "Je n'ai pas de voiture !"
    ],
    "Que doit-on savoir sur vous avant de sortir ensemble ?": [
      "Mon signe astrologique",
      "Je ne te ghosterai jamais",
      "Mon animal de compagnie passe avant tout",
      "Je ne suis pas là pour jouer",
      "Je suis un esprit libre",
      "J'ai besoin de mes moments de solitude"
    ],
    "Le meilleur endroit pour un rendez-vous cinéma ?": [
      "Un cinéma d'art et essai chaleureux",
      "Un ciné-parc en plein air (drive-in)",
      "À la maison avec du popcorn sur le canapé",
      "Devant un grand écran IMAX",
      "Un cinéma sur un toit-terrasse"
    ],
    "Que recherchez-vous ?": [
      "Une relation simple et décontractée",
      "Mimi et sans prise de tête",
      "Une connexion profonde avant tout",
      "De nouvelles expériences",
      "De vraies amitiés",
      "Je me laisse porter"
    ],
    "Quel est votre plus grand critère rédhibitoire ?": [
      "Les ronflements (j'ai besoin de dormir)",
      "Ceux qui ne mangent rien",
      "Le manque de respect envers le personnel",
      "Ne pas m'entendre avec ma famille",
      "La non-monogamie",
      "Être systématiquement en retard"
    ],
    "Quel est le métier de vos rêves ?": [
      "Je ne rêve pas de travailler !",
      "Des revenus passifs, évidemment",
      "Être mon propre patron",
      "Créateur / Créatrice de contenu",
      "Vendre mes créations artisanales"
    ],
    "À quoi ressemble l'amour selon vous ?": [
      "Rien ne vaut la franchise et l'honnêteté",
      "Accorder du temps de qualité",
      "Rire ensemble tous les jours",
      "Se soutenir mutuellement toujours",
      "Se sentir accepté(e) comme on est"
    ],
    "Comment aimez-vous passer vos week-ends ?": [
      "Explorer une nouvelle ville",
      "Blotti(e) sous la couette",
      "Ils ne se ressemblent jamais",
      "Dans un bar ou en soirée",
      "Devant un bon jeu vidéo ou un film",
      "En famille"
    ],
    "Qu'est-ce qui vous fait rire ?": [
      "Mon humoriste préféré",
      "Envoie-moi tes meilleurs memes",
      "À toi de le découvrir",
      "Les blagues légères et le second degré",
      "L'humour sarcastique"
    ],
    "À quoi ressemble la vie de vos rêves ?": [
      "Une belle maison et de la sérénité",
      "Des voyages aux quatre coins du monde",
      "De grands dîners chaleureux",
      "Une carrière épanouissante",
      "Avoir un impact positif sur le monde"
    ],
    "Quelle est la chose incontournable sur votre liste de souhaits ?": [
      "Faire du stand-up",
      "Déménager dans un nouveau pays",
      "Lancer mon propre projet",
      "Reprendre mes études",
      "Faire un nouveau tatouage"
    ],
    "Quelle est la cause qui vous tient particulièrement à cœur ?": [
      "La cause animale",
      "L'égalité des genres",
      "L'égalité raciale",
      "Le changement climatique",
      "Les droits LGBTQIA+",
      "Le bénévolat",
      "L'accessibilité et l'inclusion",
      "La santé mentale"
    ],
    "Quel est votre genre de musique préféré ?": [
      "Des rythmes chill et posés",
      "De la musique nostalgique",
      "Rien de fixe, partage-moi ton morceau !",
      "Tout ce qui fait danser",
      "Des chansons aux paroles profondes"
    ],
    "Quel est votre premier rendez-vous idéal ?": [
      "J'adore me faire surprendre",
      "Une activité stimulante, c'est parti !",
      "Un café et une bonne discussion",
      "Un verre et un bon repas",
      "Une passion que l'on partage à deux",
      "Une occasion de bien me saper"
    ],
    "Que pensez-vous de l'astrologie ?": [
      "Ce n'est pas de la science",
      "Je ne comprends pas l'engouement",
      "J'ai besoin de connaître ton Big 3",
      "C'est marrant sans plus",
      "Pas mon truc, mais je respecte",
      "Voyons si nous sommes compatibles"
    ],
    "Qu'est-ce que les gens devraient savoir sur vous ?": [
      "J'ai une passion secrète",
      "Il faudra valider auprès de mon/ma meilleur(e) ami(e)",
      "Je suis plutôt casanier(ère)",
      "Je concocte les meilleures playlists"
    ],
    "De quoi êtes-vous le/la plus fier(e) ?": [
      "Ma philosophie de vie",
      "Mes enfants",
      "Mon ambition et ma motivation",
      "Mes efforts pour rester en forme",
      "Défendre ce en quoi je crois",
      "Avoir appris à m'aimer"
    ],
    "Qu'essayez-vous d'apprendre en ce moment ?": [
      "Une nouvelle langue",
      "Cuisiner comme un chef",
      "Une compétence artistique",
      "Créer mon entreprise",
      "La gestion de mon temps !"
    ],
    "Quel est votre objectif amoureux cette année ?": [
      "Trouver mon/ma partenaire de vie",
      "Faire plus de double dates entre amis",
      "Découvrir ce dont j'ai vraiment envie",
      "Faire de belles rencontres inspirantes"
    ],
    "Comment prenez-vous soin de vous ?": [
      "Les siestes résolvent tout",
      "Du bon repas et un bon film",
      "Une bonne séance de sport",
      "M'entourer de mes cristaux",
      "Passer du temps avec ceux que j'aime"
    ],
    "À quoi ressembliez-vous au lycée ?": [
      "L'élève calme au fond de la classe",
      "Toujours en retenue !",
      "Ami(e) avec tout le monde",
      "Le clown de la classe",
      "Ultra concentré(e) sur mes notes"
    ],
    "Quel est votre avis sur la monogamie ?": [
      "C'est exactement ce que je recherche",
      "Partant(e) pour essayer",
      "Ça dépend des périodes de la vie",
      "C'est cool, mais pas pour moi",
      "Je ne crois pas à la monogamie"
    ],
    "Au cinéma, que regardez-vous ?": [
      "Le dernier blockbuster",
      "Un film d'auteur",
      "Tant que c'est en VOSTFR",
      "Tant que ce n'est pas doublé",
      "Un film d'animation"
    ],
    "Quelle est votre façon préférée de passer un week-end ?": [
      "Prendre un vol spontané vers une grande ville",
      "Me détendre à la montagne",
      "Profiter tranquillement chez moi",
      "Partir au bord de la mer",
      "Rendre visite à la famille"
    ],
    "Quel est votre sport préféré à regarder ?": [
      "Le rugby, sans hésiter",
      "Le football, évidemment !",
      "Le tennis",
      "Les sports de glisse",
      "Les sports mécaniques"
    ]
  };

  const handleOpenPromptModal = (question: string) => {
    setActivePrompt(question);
    
    let currentAnswer = '';
    if (prompt1Question === question) currentAnswer = prompt1Answer;
    else if (prompt2Question === question) currentAnswer = prompt2Answer;
    else if (prompt3Question === question) currentAnswer = prompt3Answer;

    const options = PROMPT_OPTIONS_MAP[question] || [];
    if (currentAnswer && options.includes(currentAnswer)) {
      setSelectedPromptOption(currentAnswer);
      setCustomPromptAnswer('');
    } else if (currentAnswer) {
      setSelectedPromptOption('Your own answer');
      setCustomPromptAnswer(currentAnswer);
    } else {
      setSelectedPromptOption('');
      setCustomPromptAnswer('');
    }
  };

  // Move from Step 5 to Step 6
  const handleSubmitStep5 = () => {
    setStep(6);
  };

  // Move from Step 6 to Step 7
  const handleSubmitStep6 = () => {
    setStep(7);
  };

  // Move from Step 7 to Step 8
  const handleSubmitStep7 = () => {
    setStep(8);
  };

  // Move from Step 8 to Step 9
  const handleSubmitStep8 = () => {
    setStep(9);
  };

  // Move from Step 9 to Step 10
  const handleSubmitStep9 = () => {
    setStep(10);
  };

  // Move from Step 10 to Step 11
  const handleSubmitStep10 = () => {
    setStep(11);
  };

  // Move from Step 11 to Step 12
  const handleSubmitStep11 = () => {
    setStep(12);
  };

  // Move from Step 12 to Step 13
  const handleSubmitStep12 = () => {
    setStep(13);
  };

  // Move from Step 13 to Step 14
  const handleSubmitStep13 = () => {
    setStep(14);
  };

  // Move from Step 14 to Step 15
  const handleSubmitStep14 = () => {
    setStep(15);
  };

  // Move from Step 15 to Step 16 (Answer questions)
  const handleSubmitStep15 = () => {
    setStep(16);
  };

  // Move from Step 16 to Step 19
  const handleSubmitStep16 = () => {
    setStep(19);
  };

  // Move from Step 19 to Step 20 (Pets -> Zodiac)
  const handleSubmitStep19 = () => {
    setStep(20);
  };

  // Move from Step 20 to Step 21 (Zodiac -> Religion)
  const handleSubmitStep20 = () => {
    setStep(21);
  };

  // Move from Step 21 to Step 21.5 (Religion -> Languages)
  const handleSubmitStep21 = () => {
    setStep(21.5);
  };

  // Move from Step 21.5 to Step 3.1 (Languages -> Location)
  const handleSubmitStep21_5 = () => {
    setStep(3.1);
  };

  // Move from Step 22 to Step 23 (Photo Verify Intro -> Pose Verification - Image 2)
  const handleSubmitStep22 = () => {
    setVerificationErrorMsg('La vérification photo est indisponible. Aucun selfie ne sera demandé.');
  };

  // Toggle interest selection
  const toggleInterest = (interestLabel: string) => {
    setInterests(prev => {
      if (prev.includes(interestLabel)) {
        return prev.filter(i => i !== interestLabel);
      }
      if (prev.length >= 8) {
        return prev;
      }
      return [...prev, interestLabel];
    });
  };

  // Final submit from Step 18
  const handleSubmitFinal = async () => {
    if (isSubmitting) return;
    const selectedOrientationLabel = orientationOptions.find(o => o.id === sexualOrientation)?.label || 'Je préfère ne pas le dire';
    const selectedRelationshipLabel = relationshipOptions.find(o => o.id === relationshipStatus)?.label || 'Je préfère ne pas le dire';
    const selectedDrinkingLabel = drinkingOptions.find(o => o.id === drinking)?.label || 'Je préfère ne pas le dire';
    const selectedSmokingLabel = smokingOptions.find(o => o.id === smoking)?.label || 'Je préfère ne pas le dire';
    const selectedKidsLabel = kidsOptions.find(o => o.id === kids)?.label || 'Je préfère ne pas le dire';
    const selectedEducationLabel = educationLevelOptions.find(o => o.id === educationLevel)?.label || 'Je préfère ne pas le dire';
    const selectedPersonalityLabel = personalityOptions.find(o => o.id === personality)?.label || 'Je préfère ne pas le dire';
    const selectedPetsLabel = petsOptions.find(o => o.id === pets)?.label || 'Je préfère ne pas le dire';
    const selectedStarSignLabel = starSignOptions.find(o => o.id === starSign)?.label || 'I\'d rather not say';
    const selectedReligionLabel = religionOptions.find(o => o.id === religion)?.label || 'I\'d rather not say';
    const selectedLanguagesLabel = languages.map(id => languagesOptions.find(o => o.id === id)?.label || id).join(', ');
    
    // Format height or set as "Je préfère ne pas le dire"
    const heightStr = heightNotSay ? 'Je préfère ne pas le dire' : (isCm ? `${heightValue} cm` : formatFeetInches(heightValue));

    // Profile Scanner AI (Auto-Censorship of direct phone numbers / contact info and vulgarity)
    const scanResult = aiSystemEngine.scanAndCensorProfileBio(bio);
    const finalBio = scanResult.censoredBio;

    const quizData = {
      name: name.trim(),
      gender: gender === 'more' ? (customGender || 'Autre') : (gender === 'female' ? 'Femme' : 'Homme'),
      birthday: birthday,
      email: initialEmail || undefined,
      phone: initialPhone || undefined,
      purpose: purpose === 'date' ? 'Faire des rencontres' : purpose === 'chat' ? 'Discuter' : 'Relation sérieuse',
      city: userLocation ? userLocation.split(',')[0].trim() : undefined,
      location: userLocation.trim() || undefined,
      country: parseProfileLocation(userLocation).country || undefined,
      countryCode: parseProfileLocation(userLocation).countryCode,
      locationSource,
      latitude: userLat,
      longitude: userLon,
      sexualOrientation: selectedOrientationLabel,
      relationshipStatus: selectedRelationshipLabel,
      bio: finalBio.trim(),
      height: heightStr,
      school: school.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      company: company.trim() || undefined,
      drinking: selectedDrinkingLabel,
      smoking: selectedSmokingLabel,
      kids: selectedKidsLabel,
      educationLevel: selectedEducationLabel,
      personality: selectedPersonalityLabel,
      interests: interests.length > 0 ? interests : undefined,
      pets: selectedPetsLabel,
      starSign: selectedStarSignLabel,
      religion: selectedReligionLabel,
      languages: selectedLanguagesLabel || 'Français',
      prompt1Question: prompt1Question || undefined,
      prompt1Answer: prompt1Answer || undefined,
      prompt2Question: prompt2Question || undefined,
      prompt2Answer: prompt2Answer || undefined,
      prompt3Question: prompt3Question || undefined,
      prompt3Answer: prompt3Answer || undefined
    };

    // Save quiz data to Supabase
    if (!quizData.name || !quizData.birthday || !quizData.purpose || !quizData.location) {
      setSubmissionError('Veuillez compléter votre nom, votre date de naissance et votre localisation.');
      return;
    }
    setSubmissionError(null);
    setIsSubmitting(true);
    try {
      const result = await completeOnboardingInSupabase(quizData, userPhotos.filter(Boolean));
      if (!result.success) {
        console.error('Onboarding persistence failed:', result.error);
        setSubmissionError(result.error || 'Impossible d’enregistrer votre profil. Réessayez.');
        return;
      }
      await onComplete({ ...quizData, photos: userPhotos.filter(Boolean) });
    } catch (error) {
      console.error('Onboarding persistence failed:', error);
      setSubmissionError('Impossible d’enregistrer votre profil. Vérifiez votre connexion et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-0 md:p-4 select-none font-sans overflow-hidden">
      {/* Mobile Shell Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full h-full md:max-w-[370px] md:max-h-[740px] ${step === 1 ? 'bg-[#141517] text-white border-neutral-800' : 'bg-white text-black border-gray-100'} md:rounded-[36px] shadow-2xl flex flex-col justify-between relative overflow-hidden border transition-colors duration-300 mobile-scale`}
      >
        {/* Top Header & Progress Line */}
        {step < 3 && step !== 1 && (
          <div className="w-full">
            {/* Thin Progress bar at the very top resembling screenshots */}
            <div className="w-full h-[4px] bg-gray-100 flex">
              <motion.div 
                initial={{ width: '0%' }}
                animate={{ width: step === 1 ? '50%' : step === 2 ? '100%' : '0%' }}
                className="h-full bg-neutral-900"
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>

            {/* Nav Row */}
            <div className="pt-3 px-4 flex items-center">
              <button 
                onClick={() => {
                  if (step === 2) {
                    setStep(1);
                  } else {
                    onBack();
                  }
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                aria-label="Retour"
              >
                <ArrowLeft className="w-[19px] h-[19px] stroke-[2.5]" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Step Views */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0, scale: 0.97, y: 10 },
                visible: { 
                  opacity: 1, 
                  scale: 1,
                  y: 0,
                  transition: { staggerChildren: 0.08, delayChildren: 0.05, duration: 0.3 }
                },
                exit: { opacity: 0, scale: 0.97, y: -10, transition: { duration: 0.15 } }
              }}
              className="flex-1 flex flex-col px-5 sm:px-6 pt-3 pb-5 overflow-y-auto scrollbar-hide justify-between bg-[#0B0C10] text-white relative"
            >
              {/* Subtle ambient lighting glows in background */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[240px] h-[160px] bg-rose-600/15 rounded-full blur-[70px] pointer-events-none" />
              <div className="absolute bottom-10 right-0 w-[180px] h-[180px] bg-violet-600/10 rounded-full blur-[60px] pointer-events-none" />

              <div className="space-y-4 relative z-10">
                
                {/* Header Badge & Title */}
                <div className="flex flex-col items-center justify-center pt-1 text-center">
                  <h1 className="text-[20px] sm:text-[23px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-rose-300">
                    Rencontres Sincères
                  </h1>
                  <p className="text-[12.5px] text-gray-400 font-medium mt-1 leading-snug max-w-[280px]">
                    Rejoignez la communauté d'élite en Côte d'Ivoire .
                  </p>
                </div>

                {/* Section 1: JE SUIS */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-extrabold tracking-wider text-rose-300/80 uppercase block">
                      JE SUIS
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium">Obligatoire</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Homme */}
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`h-[52px] rounded-2xl border flex items-center justify-center space-x-2.5 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                        gender === 'male' || !gender
                          ? 'bg-gradient-to-r from-rose-950/60 to-pink-950/40 border-rose-500/80 text-white shadow-[0_4px_20px_rgba(244,63,94,0.25)]'
                          : 'bg-[#14151a] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        gender === 'male' || !gender ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400'
                      }`}>
                        ♂
                      </div>
                      <span className="text-[13.5px] font-bold">Homme</span>
                      {(gender === 'male' || !gender) && (
                        <div className="absolute right-3 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
                      )}
                    </button>

                    {/* Femme */}
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`h-[52px] rounded-2xl border flex items-center justify-center space-x-2.5 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] ${
                        gender === 'female'
                          ? 'bg-gradient-to-r from-rose-950/60 to-pink-950/40 border-rose-500/80 text-white shadow-[0_4px_20px_rgba(244,63,94,0.25)]'
                          : 'bg-[#14151a] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        gender === 'female' ? 'bg-rose-500 text-white' : 'bg-white/5 text-gray-400'
                      }`}>
                        ♀
                      </div>
                      <span className="text-[13.5px] font-bold">Femme</span>
                      {gender === 'female' && (
                        <div className="absolute right-3 w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Section 2: JE CHERCHE */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-extrabold tracking-wider text-rose-300/80 uppercase block">
                    JE CHERCHE
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Homme */}
                    <button
                      type="button"
                      onClick={() => setLookingFor('male')}
                      className={`h-[48px] rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-[0.97] ${
                        lookingFor === 'male'
                          ? 'bg-rose-950/50 border-rose-500 text-white shadow-[0_2px_15px_rgba(244,63,94,0.2)]'
                          : 'bg-[#14151a] border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xs font-bold leading-none mb-0.5">♂</span>
                      <span className="text-[11.5px] font-bold">Homme</span>
                    </button>

                    {/* Femme */}
                    <button
                      type="button"
                      onClick={() => setLookingFor('female')}
                      className={`h-[48px] rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-[0.97] ${
                        lookingFor === 'female'
                          ? 'bg-rose-950/50 border-rose-500 text-white shadow-[0_2px_15px_rgba(244,63,94,0.2)]'
                          : 'bg-[#14151a] border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xs font-bold leading-none mb-0.5">♀</span>
                      <span className="text-[11.5px] font-bold">Femme</span>
                    </button>

                    {/* Les Deux */}
                    <button
                      type="button"
                      onClick={() => setLookingFor('both')}
                      className={`h-[48px] rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer active:scale-[0.97] ${
                        lookingFor === 'both'
                          ? 'bg-violet-950/60 border-violet-500 text-violet-200 shadow-[0_2px_15px_rgba(139,92,246,0.25)]'
                          : 'bg-[#14151a] border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xs font-bold leading-none mb-0.5">⚧</span>
                      <span className="text-[11.5px] font-bold">Les Deux</span>
                    </button>
                  </div>
                </div>

                {/* Section 3: VOTRE PRÉNOM */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-extrabold tracking-wider text-rose-300/80 uppercase block">
                    VOTRE PRÉNOM
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Prenom..."
                      className="w-full bg-[#14151a] border border-white/10 focus:border-rose-500 text-white rounded-2xl pl-10 pr-4 py-3 text-[14px] font-semibold outline-none placeholder:text-gray-500 transition-all shadow-inner focus:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-rose-400 text-[11px] font-semibold mt-1 px-1 flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Section 4: QUEL ÂGE AVEZ-VOUS ? */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-extrabold tracking-wider text-rose-300/80 uppercase block">
                    VOTRE ÂGE
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAgePickerModal(true)}
                      className="w-full bg-[#14151a] border border-white/10 text-white rounded-2xl pl-10 pr-10 py-3 text-[14px] font-semibold text-left focus:border-rose-500 cursor-pointer transition-all shadow-inner flex items-center justify-between hover:border-rose-500/50"
                    >
                      <Calendar className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <span className="text-white font-bold">{userAge} ans</span>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Custom In-App Age Selection Modal Bottom Sheet */}
              <AnimatePresence>
                {showAgePickerModal && (
                  <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4">
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                      className="w-full max-w-md bg-[#121318] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 text-white max-h-[80vh] flex flex-col shadow-2xl relative"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-5 h-5 text-rose-500" />
                          <h3 className="text-[17px] font-extrabold text-white">Sélectionnez votre âge</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAgePickerModal(false)}
                          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300 hover:bg-white/20 transition-all cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="py-2.5 text-[12.5px] text-gray-400 font-medium">
                        Âge minimum requis : <span className="text-white font-bold">18 ans</span>.
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-[340px] py-1 space-y-1 scrollbar-thin scrollbar-thumb-gray-800 pr-1">
                        {Array.from({ length: 82 }, (_, i) => i + 18).map((age) => {
                          const isSelected = userAge === age;
                          return (
                            <button
                              key={age}
                              type="button"
                              onClick={() => {
                                setUserAge(age);
                                const year = new Date().getFullYear() - age;
                                setBirthday(`${year}-06-15`);
                                setErrors(prev => ({ ...prev, birthday: undefined }));
                                setShowAgePickerModal(false);
                              }}
                              className={`w-full py-3 px-4 rounded-2xl flex items-center justify-between text-[15px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                                  : 'bg-white/5 hover:bg-white/10 text-gray-200'
                              }`}
                            >
                              <span>{age} ans</span>
                              {isSelected && <Check className="w-5 h-5 text-white stroke-[2.5]" />}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAgePickerModal(false)}
                        className="w-full mt-3 py-3.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-black rounded-2xl text-[14.5px] transition-all cursor-pointer shadow-lg"
                      >
                        Valider ({userAge} ans)
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              <div className="pt-2 mt-1 relative z-10">
                <button
                  type="button"
                  onClick={handleContinueStep1}
                  className="w-full h-[44px] bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 active:scale-[0.98] text-white font-extrabold text-[13.5px] rounded-full flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Découvrir les Célibataires</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col px-5 pt-1 pb-4 overflow-y-auto scrollbar-hide justify-between"
            >
              <div className="space-y-4">
                {/* Title Block - Centered as in screenshots */}
                <div className="text-center px-1">
                  <h1 className="text-[20px] font-[800] tracking-tight text-black leading-tight mb-1.5">
                    Entrez, {name} ! Dites-nous ce qui vous amène.
                  </h1>
                  <p className="text-[12px] text-gray-400 font-[500] leading-normal px-2">
                    Soyez clair sur ce que vous voulez pour trouver les bonnes personnes. Modifiable à tout moment.
                  </p>
                </div>

                {/* Purpose Selection Cards faithful to screenshot */}
                <div className="space-y-2.5">
                  {/* Option 1: Here to date */}
                  <button
                    type="button"
                    onClick={() => setPurpose('date')}
                    className={`w-full py-3 px-3.5 rounded-[18px] text-left transition-all duration-200 border flex items-center ${
                      purpose === 'date' 
                        ? 'bg-[#EFE5FF] border-[#D4C3FC] text-black shadow-sm' 
                        : 'bg-gray-50 hover:bg-gray-100 border-transparent text-black'
                    }`}
                  >
                    {/* Left Icon Container */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-transparent text-black mr-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                        <Coffee className="w-4 h-4 fill-current" />
                      </div>
                    </div>

                    {/* Text block */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-[14px] font-[800] text-black leading-tight mb-0.5">
                        Faire des rencontres
                      </h3>
                      <p className="text-[11px] text-gray-500 font-[500] leading-snug">
                        Je veux faire des rencontres et passer de bons moments. Sans prise de tête.
                      </p>
                    </div>

                    {/* Radio circle */}
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      purpose === 'date' 
                        ? 'border-black bg-black' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {purpose === 'date' && (
                        <div className="w-[7px] h-[7px] rounded-full bg-white" />
                      )}
                    </div>
                  </button>

                  {/* Option 2: Open to chat */}
                  <button
                    type="button"
                    onClick={() => setPurpose('chat')}
                    className={`w-full py-3 px-3.5 rounded-[18px] text-left transition-all duration-200 border flex items-center ${
                      purpose === 'chat' 
                        ? 'bg-[#EFE5FF] border-[#D4C3FC] text-black shadow-sm' 
                        : 'bg-gray-50 hover:bg-gray-100 border-transparent text-black'
                    }`}
                  >
                    {/* Left Icon Container */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-transparent text-black mr-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                        <MessageCircle className="w-4 h-4 fill-current" />
                      </div>
                    </div>

                    {/* Text block */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-[14px] font-[800] text-black leading-tight mb-0.5">
                        Discuter
                      </h3>
                      <p className="text-[11px] text-gray-500 font-[500] leading-snug">
                        Je suis là pour discuter et voir où ça mène. Sans pression.
                      </p>
                    </div>

                    {/* Radio circle */}
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      purpose === 'chat' 
                        ? 'border-black bg-black' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {purpose === 'chat' && (
                        <div className="w-[7px] h-[7px] rounded-full bg-white" />
                      )}
                    </div>
                  </button>

                  {/* Option 3: Ready for relationship */}
                  <button
                    type="button"
                    onClick={() => setPurpose('relationship')}
                    className={`w-full py-3 px-3.5 rounded-[18px] text-left transition-all duration-200 border flex items-center ${
                      purpose === 'relationship' 
                        ? 'bg-[#EFE5FF] border-[#D4C3FC] text-black shadow-sm' 
                        : 'bg-gray-50 hover:bg-gray-100 border-transparent text-black'
                    }`}
                  >
                    {/* Left Icon Container */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-transparent text-black mr-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                        <Heart className="w-4 h-4 fill-current" />
                      </div>
                    </div>

                    {/* Text block */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-[14px] font-[800] text-black leading-tight mb-0.5">
                        Relation sérieuse
                      </h3>
                      <p className="text-[11px] text-gray-500 font-[500] leading-snug">
                        Je cherche quelque chose de durable. Pas de faux-semblants.
                      </p>
                    </div>

                    {/* Radio circle */}
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      purpose === 'relationship' 
                        ? 'border-black bg-black' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {purpose === 'relationship' && (
                        <div className="w-[7px] h-[7px] rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2 Finish Button */}
              <div className="pt-3 mt-auto">
                <button
                  type="button"
                  onClick={handleCompleteStep2}
                  disabled={!purpose}
                  className={`w-full h-[48px] rounded-full font-[800] text-[14.5px] flex items-center justify-center transition-all ${
                    purpose 
                      ? 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98]' 
                      : 'bg-neutral-600 text-white/90 cursor-not-allowed opacity-95'
                  }`}
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          ) : step === 3 ? (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col justify-between px-6 py-6"
            >
              {/* Abstract Illustration matching the screenshot */}
              <div className="flex-1 flex items-center justify-center my-auto min-h-[190px]">
                <svg viewBox="0 0 400 300" className="w-full max-h-[200px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* LEFT GROUP */}
                  <g id="left-group">
                    {/* Sleeve with curvy line details */}
                    <path d="M40 210 C45 195, 55 185, 75 185 L105 185 L105 240 L50 240 C42 235, 38 225, 40 210 Z" fill="#EF5350" />
                    <path d="M48 200 Q56 205, 64 200 M52 212 Q60 217, 68 212 M56 224 Q64 229, 72 224" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    
                    {/* Stack of colorful blocks */}
                    {/* Teal bottom block */}
                    <path d="M105 180 L205 180 L205 220 L115 220 C109 220, 105 216, 105 210 Z" fill="#29B6F6" />
                    <line x1="155" y1="180" x2="155" y2="220" stroke="#0288D1" strokeWidth="2.5" />

                    {/* Purple middle block with lips */}
                    <rect x="105" y="140" width="100" height="36" rx="4" fill="#B39DDB" />
                    {/* Pink drawn lips */}
                    <path d="M140 158 C145 152, 160 152, 165 158 C160 164, 145 164, 140 158 Z" fill="#FF8A80" stroke="#D32F2F" strokeWidth="1.5" />
                    <line x1="140" y1="158" x2="165" y2="158" stroke="#D32F2F" strokeWidth="1.5" />

                    {/* Red block with nose */}
                    <rect x="105" y="105" width="100" height="32" rx="4" fill="#EF5350" />
                    {/* Nose line */}
                    <path d="M145 112 L165 112 L165 126" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Brown hand arching over holding the red block */}
                    <path d="M75 185 C75 140, 100 105, 145 105 C170 105, 185 118, 185 125" stroke="#8D6E63" strokeWidth="16" strokeLinecap="round" />
                    {/* Eye peek-a-boo inside hand curve */}
                    <ellipse cx="145" cy="135" rx="14" ry="10" fill="white" />
                    <circle cx="145" cy="135" r="5" fill="black" />
                    <circle cx="120" cy="112" r="7" stroke="#29B6F6" strokeWidth="2" fill="none" />
                  </g>

                  {/* RIGHT GROUP */}
                  <g id="right-group">
                    {/* Blue funnel/hat block */}
                    <path d="M285 100 L325 100 L315 70 L295 70 Z" fill="#29B6F6" />
                    <line x1="290" y1="100" x2="290" y2="70" stroke="#0288D1" strokeWidth="2" />
                    <line x1="305" y1="100" x2="305" y2="70" stroke="#0288D1" strokeWidth="2" />
                    <line x1="320" y1="100" x2="320" y2="70" stroke="#0288D1" strokeWidth="2" />

                    {/* Purple block */}
                    <rect x="255" y="110" width="110" height="40" rx="4" fill="#B39DDB" />

                    {/* Blue block with eyes */}
                    <rect x="245" y="155" width="120" height="30" rx="4" fill="#29B6F6" />
                    <ellipse cx="275" cy="170" rx="10" ry="7" fill="white" />
                    <circle cx="275" cy="170" r="4.5" fill="black" />
                    <ellipse cx="330" cy="170" rx="10" ry="7" fill="white" />
                    <circle cx="330" cy="170" r="4.5" fill="black" />

                    {/* Bottom block: split light gray and dark charcoal */}
                    <path d="M240 190 L320 190 L320 220 L240 220 Z" fill="#F5F5F5" />
                    <path d="M320 190 L365 190 L365 220 L320 220 Z" fill="#212121" />

                    {/* White skin-toned hand reaching down over the purple block */}
                    <path d="M315 90 L315 135 C315 142, 310 145, 305 145" stroke="#FFF9C4" strokeWidth="14" strokeLinecap="round" />
                    {/* Red nails/fingertips */}
                    <circle cx="292" cy="142" r="3" fill="#EF5350" />
                    <circle cx="302" cy="145" r="3" fill="#EF5350" />
                    <circle cx="312" cy="142" r="3" fill="#EF5350" />
                  </g>
                </svg>
              </div>

              {/* Title & Action buttons */}
              <div className="space-y-4 mt-auto">
                <h2 className="text-[20px] font-[800] tracking-tight text-black leading-tight text-center px-1">
                  Faites notre quiz rapide pour compléter votre profil
                </h2>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handleCompleteWizard(true)}
                    className="w-full h-[50px] bg-neutral-950 text-white rounded-full font-[800] text-[15px] flex items-center justify-center transition-all hover:bg-neutral-800 active:scale-[0.98]"
                  >
                    Commencer le quiz
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCompleteWizard(false)}
                    className="w-full py-2 text-center text-[14.5px] font-[800] text-neutral-900 hover:text-neutral-700 active:scale-95 transition-all block"
                  >
                    Peut-être plus tard
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 3.1 ? (
            <motion.div 
              key="step3_1"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between px-6 pt-3 pb-6 overflow-y-auto"
            >
              {/* Header with Back Arrow */}
              <div className="flex items-center -ml-2 mb-2">
                <button 
                  type="button"
                  onClick={() => setStep(tookQuiz ? 21.5 : 3)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              {/* Main Content */}
              <div className="space-y-5">
                <div className="text-center pt-1">
                  <h1 className="text-[20px] sm:text-[22px] font-[800] tracking-tight text-black leading-tight mb-1.5">
                    Où vous situez-vous ?
                  </h1>
                  <p className="text-[12.5px] sm:text-[13px] font-[400] text-gray-500 leading-normal px-2">
                    Indiquez votre ville pour découvrir des personnes à proximité
                  </p>
                </div>

                <div>
                  <label className="text-[13px] font-[700] text-black mb-1.5 block text-left">
                    Saisissez votre ville ou commune
                  </label>
                  
                  <div className="relative w-full">
                    <div className="relative flex items-center w-full h-[46px] sm:h-[48px] px-3.5 rounded-[16px] border border-gray-300 focus-within:border-black bg-white transition-colors">
                      <input
                        type="text"
                        value={userLocation}
                        onChange={(e) => {
                          setUserLocation(e.target.value);
                          setShowLocationSuggestions(true);
                        }}
                        onFocus={() => setShowLocationSuggestions(true)}
                        className="w-full h-full bg-transparent text-[13.5px] font-[500] text-black focus:outline-none pr-8"
                      />

                      {userLocation ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUserLocation('');
                            setShowLocationSuggestions(false);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black hover:opacity-70 p-1 rounded-full"
                          aria-label="Effacer"
                        >
                          <X className="w-4.5 h-4.5 stroke-[2.5]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isFetchingGps}
                          onClick={() => {
                            setIsFetchingGps(true);
                            if ('geolocation' in navigator) {
                              navigator.geolocation.getCurrentPosition(
                                (position) => {
                                  setUserLocation(`Position GPS (${position.coords.latitude.toFixed(2)}°, ${position.coords.longitude.toFixed(2)}°)`);
                                  setUserLat(position.coords.latitude);
                                  setUserLon(position.coords.longitude);
                                  setLocationSource('gps');
                                  setShowLocationSuggestions(false);
                                  setIsFetchingGps(false);
                                },
                                () => {
                                  setLocationSource('manual');
                                  setUserLocation('');
                                  setShowLocationSuggestions(false);
                                  setIsFetchingGps(false);
                                },
                                { timeout: 8000 }
                              );
                            } else {
                              setLocationSource('manual');
                              setUserLocation('');
                              setShowLocationSuggestions(false);
                              setIsFetchingGps(false);
                            }
                          }}
                          className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-black transition-transform ${isFetchingGps ? 'opacity-50' : 'hover:scale-110 active:scale-95'}`}
                          aria-label="Position actuelle"
                          title="Obtenir ma position GPS"
                        >
                          <svg viewBox="0 0 24 24" className={`w-4.5 h-4.5 fill-black text-black ${isFetchingGps ? 'animate-pulse' : ''}`}>
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Suggestions */}
                    {showLocationSuggestions && userLocation.trim().length > 0 && (
                      <div className="absolute top-[108%] left-0 right-0 bg-white border border-gray-200 rounded-[16px] shadow-xl z-50 max-h-[190px] overflow-y-auto divide-y divide-gray-100">
                        {SUGGESTED_CITIES.filter(c => c.toLowerCase().includes(userLocation.toLowerCase())).slice(0, 30).map((city, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setUserLocation(city);
                              setLocationSource('manual');
                              setShowLocationSuggestions(false);
                            }}
                            className="w-full text-left px-3.5 py-2.5 text-[12.5px] font-medium text-black hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span>{city}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-4 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (!userLocation.trim()) return;
                    setStep(3.2);
                  }}
                  disabled={!userLocation.trim()}
                  className={`w-full h-[46px] sm:h-[48px] rounded-full font-[700] text-[14px] flex items-center justify-center transition-all duration-200 ${
                    userLocation.trim() 
                      ? 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98] cursor-pointer shadow-sm' 
                      : 'bg-[#48484A] text-white/90 cursor-not-allowed opacity-90'
                  }`}
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          ) : step === 3.2 ? (
            <motion.div 
              key="step3_2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between px-6 pt-3 pb-6 overflow-y-auto"
            >
              {/* Header with Back Arrow */}
              <div className="flex items-center -ml-2 mb-1">
                <button 
                  type="button"
                  onClick={() => setStep(3.1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              {/* Main Content */}
              <div className="space-y-4">
                <div className="pt-1">
                  <h1 className="text-[20px] sm:text-[22px] font-[800] tracking-tight text-black leading-tight mb-1.5">
                    Ajoutez vos 2 premières photos
                  </h1>
                  <p className="text-[12.5px] sm:text-[13px] font-[400] text-gray-500 leading-normal">
                    Montrez-vous sous votre meilleur jour ! Une belle photo avec votre animal, un bon plat ou en voyage. 🐶🍕🌴
                  </p>
                </div>

                {/* Duplicate / Photo Error Message Banner */}
                {photoDuplicateError && (
                  <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center space-x-2.5 text-red-700 animate-fade-in">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                    <p className="text-[12.5px] font-[600] leading-snug">{photoDuplicateError}</p>
                  </div>
                )}

                {/* 2 Photos Slot Grid */}
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  {[0, 1].map((slotIndex) => {
                    const photo = userPhotos[slotIndex];
                    return (
                      <div 
                        key={slotIndex} 
                        className="relative aspect-[3/4] w-full rounded-[22px] overflow-hidden bg-[#F3F3F4] border border-transparent flex flex-col items-center justify-center transition-all shadow-xs"
                      >
                        {photo ? (
                          <>
                            <img 
                              src={photo} 
                              alt={`Photo ${slotIndex + 1}`} 
                              className="w-full h-full object-cover rounded-[22px]" 
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserPhotos(prev => prev.filter((_, idx) => idx !== slotIndex));
                                setPhotoDuplicateError(null);
                              }}
                              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                              aria-label="Supprimer photo"
                            >
                              <X className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActivePhotoSlot(slotIndex);
                              setShowPhotoModal(true);
                            }}
                            className="w-full h-full flex flex-col items-center justify-center p-3 text-black hover:bg-gray-200/50 transition-colors"
                          >
                            <Plus className="w-7 h-7 stroke-[2.5] mb-1.5 text-black" />
                            <span className="text-[13px] font-[700] text-black">Add photo</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-6 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (userPhotos.length < 2) {
                      setPhotoDuplicateError("Veuillez ajouter 2 photos de vous différentes pour continuer.");
                      setShowPhotoModal(true);
                      return;
                    }
                    if (userPhotos[0] === userPhotos[1]) {
                      setPhotoDuplicateError("Les 2 photos doivent être différentes. Veuillez remplacer l'une des 2 photos.");
                      return;
                    }
                    setPhotoDuplicateError(null);
                    setStep(22);
                  }}
                  className="w-full h-[52px] sm:h-[54px] rounded-full font-[700] text-[16px] flex items-center justify-center bg-black text-white hover:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  Continuer ({userPhotos.length}/2 photos)
                </button>
              </div>
            </motion.div>
          ) : step === 4 ? (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Space Illustration (Astronaut with Flag) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 320 180" className="w-full max-h-[130px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background Stars */}
                  <circle cx="45" cy="35" r="1.5" fill="#B39DDB" />
                  <circle cx="280" cy="45" r="1" fill="#B39DDB" />
                  <circle cx="100" cy="20" r="1.2" fill="#B39DDB" />
                  
                  {/* Planet Saturn in top-left */}
                  <ellipse cx="40" cy="50" rx="14" ry="10" fill="#E1BEE7" />
                  <path d="M20 53 C30 43, 50 43, 60 53 C55 60, 25 60, 20 53 Z" stroke="#B39DDB" strokeWidth="2.5" fill="none" />
                  
                  {/* Red/Pink cratered Moon in top-right */}
                  <circle cx="270" cy="65" r="12" fill="#FF8A80" />
                  <circle cx="266" cy="61" r="2.5" fill="#EF9A9A" />
                  <circle cx="274" cy="69" r="2" fill="#EF9A9A" />
                  <circle cx="272" cy="59" r="1.5" fill="#EF9A9A" />

                  {/* Curved red/orange hills with hearts */}
                  <path d="M10 180 C80 115, 240 115, 310 180 Z" fill="#FFCDD2" />
                  {/* Hearts on the floor */}
                  <path d="M80 150 C80 145, 95 145, 95 150 C95 155, 80 160, 80 150 Z" fill="#EF5350" />
                  <path d="M230 145 C230 140, 245 140, 245 145 C245 150, 230 155, 230 145 Z" fill="#EF5350" />

                  {/* Flagpole and Flag with heart */}
                  <line x1="205" y1="140" x2="205" y2="55" stroke="black" strokeWidth="3" strokeLinecap="round" />
                  <path d="M205 55 L265 55 L255 70 L265 85 L205 85 Z" fill="#EF5350" />
                  {/* Heart on flag */}
                  <path d="M227 65 C227 62, 233 62, 233 65 C233 69, 227 73, 227 65 Z" fill="white" />
                  <path d="M233 65 C233 62, 239 62, 239 65 C239 69, 233 73, 233 65 Z" fill="white" />

                  {/* Astronaut */}
                  {/* Legs */}
                  <path d="M135 125 L125 150" stroke="#E1BEE7" strokeWidth="10" strokeLinecap="round" />
                  <path d="M155 125 L165 150" stroke="#E1BEE7" strokeWidth="10" strokeLinecap="round" />
                  <path d="M118 150 L128 150" stroke="black" strokeWidth="4" strokeLinecap="round" />
                  <path d="M160 150 L170 150" stroke="black" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Body / Spacesuit */}
                  <rect x="125" y="85" width="40" height="38" rx="12" fill="#EDE7F6" stroke="black" strokeWidth="1.5" />
                  {/* Backpack */}
                  <rect x="117" y="89" width="8" height="26" rx="3" fill="#D1C4E9" />
                  {/* Suit Controls (three red dots + black plate) */}
                  <circle cx="135" cy="95" r="1.5" fill="#EF5350" />
                  <circle cx="145" cy="95" r="1.5" fill="#EF5350" />
                  <circle cx="155" cy="95" r="1.5" fill="#EF5350" />
                  <rect x="133" y="103" width="24" height="4" rx="1" fill="black" />

                  {/* Arms */}
                  {/* Waving left arm */}
                  <path d="M125 91 C115 85, 105 75, 100 60" stroke="#EDE7F6" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="100" cy="60" r="5" fill="#B39DDB" />
                  
                  {/* Right arm holding flagpole */}
                  <path d="M165 91 C180 91, 185 105, 205 105" stroke="#EDE7F6" strokeWidth="8" strokeLinecap="round" />
                  <circle cx="203" cy="105" r="5" fill="#B39DDB" />

                  {/* Helmet */}
                  <circle cx="145" cy="67" r="18" fill="white" stroke="black" strokeWidth="1.5" />
                  {/* Visor */}
                  <ellipse cx="145" cy="67" rx="13" ry="9" fill="#1A237E" />
                  {/* Visor reflection */}
                  <ellipse cx="141" cy="64" rx="4" ry="2.5" fill="white" opacity="0.6" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-0.5 pb-2 overflow-hidden justify-between">
                <div>
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-center mb-3 leading-tight">
                    Quelle est votre orientation sexuelle ?
                  </h1>

                  {/* Scrollable Orientation Options */}
                  <div className="space-y-1.5 max-h-[260px] md:max-h-[300px] overflow-y-auto scrollbar-hide pr-1 pb-2">
                    {orientationOptions.map((opt) => {
                      const isSelected = sexualOrientation === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSexualOrientation(opt.id)}
                          className={`w-full h-[40px] px-3.5 rounded-[14px] flex items-center justify-between text-left transition-all duration-150 border ${
                            isSelected 
                              ? 'bg-[#EFE5FF] border-[#D4C3FC] text-black shadow-sm' 
                              : 'bg-[#F5F5F5] hover:bg-gray-100 border-transparent text-black/80'
                          }`}
                        >
                          <span className={`text-[13px] ${isSelected ? 'font-bold text-black' : 'font-semibold'}`}>
                            {opt.label}
                          </span>
                          
                          {/* Radio circle */}
                          <div className={`w-[17px] h-[17px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected 
                              ? 'border-black bg-white' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && (
                              <div className="w-[8px] h-[8px] rounded-full bg-black" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white">
                  <div className="w-10 h-10 mr-4" aria-hidden="true" />
                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button */}
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 5 ? (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Abstract Illustration matching the screenshot */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 300" className="w-full max-h-[130px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* LEFT GROUP */}
                  <g id="left-group">
                    {/* Sleeve with curvy line details */}
                    <path d="M40 210 C45 195, 55 185, 75 185 L105 185 L105 240 L50 240 C42 235, 38 225, 40 210 Z" fill="#EF5350" />
                    <path d="M48 200 Q56 205, 64 200 M52 212 Q60 217, 68 212 M56 224 Q64 229, 72 224" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    
                    {/* Stack of colorful blocks */}
                    {/* Teal bottom block */}
                    <path d="M105 180 L205 180 L205 220 L115 220 C109 220, 105 216, 105 210 Z" fill="#29B6F6" />
                    <line x1="155" y1="180" x2="155" y2="220" stroke="#0288D1" strokeWidth="2.5" />

                    {/* Purple middle block with lips */}
                    <rect x="105" y="140" width="100" height="36" rx="4" fill="#B39DDB" />
                    {/* Pink drawn lips */}
                    <path d="M140 158 C145 152, 160 152, 165 158 C160 164, 145 164, 140 158 Z" fill="#FF8A80" stroke="#D32F2F" strokeWidth="1.5" />
                    <line x1="140" y1="158" x2="165" y2="158" stroke="#D32F2F" strokeWidth="1.5" />

                    {/* Red block with nose */}
                    <rect x="105" y="105" width="100" height="32" rx="4" fill="#EF5350" />
                    {/* Nose line */}
                    <path d="M145 112 L165 112 L165 126" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Brown hand arching over holding the red block */}
                    <path d="M75 185 C75 140, 100 105, 145 105 C170 105, 185 118, 185 125" stroke="#8D6E63" strokeWidth="16" strokeLinecap="round" />
                    {/* Eye peek-a-boo inside hand curve */}
                    <ellipse cx="145" cy="135" rx="14" ry="10" fill="white" />
                    <circle cx="145" cy="135" r="5" fill="black" />
                    <circle cx="120" cy="112" r="7" stroke="#29B6F6" strokeWidth="2" fill="none" />
                  </g>

                  {/* RIGHT GROUP */}
                  <g id="right-group">
                    {/* Blue funnel/hat block */}
                    <path d="M285 100 L325 100 L315 70 L295 70 Z" fill="#29B6F6" />
                    <line x1="290" y1="100" x2="290" y2="70" stroke="#0288D1" strokeWidth="2" />
                    <line x1="305" y1="100" x2="305" y2="70" stroke="#0288D1" strokeWidth="2" />
                    <line x1="320" y1="100" x2="320" y2="70" stroke="#0288D1" strokeWidth="2" />

                    {/* Purple block */}
                    <rect x="255" y="110" width="110" height="40" rx="4" fill="#B39DDB" />

                    {/* Blue block with eyes */}
                    <rect x="245" y="155" width="120" height="30" rx="4" fill="#29B6F6" />
                    <ellipse cx="275" cy="170" rx="10" ry="7" fill="white" />
                    <circle cx="275" cy="170" r="4.5" fill="black" />
                    <ellipse cx="330" cy="170" rx="10" ry="7" fill="white" />
                    <circle cx="330" cy="170" r="4.5" fill="black" />

                    {/* Bottom block: split light gray and dark charcoal */}
                    <path d="M240 190 L320 190 L320 220 L240 220 Z" fill="#F5F5F5" />
                    <path d="M320 190 L365 190 L365 220 L320 220 Z" fill="#212121" />

                    {/* White skin-toned hand reaching down over the purple block */}
                    <path d="M315 90 L315 135 C315 142, 310 145, 305 145" stroke="#FFF9C4" strokeWidth="14" strokeLinecap="round" />
                    {/* Red nails/fingertips */}
                    <circle cx="292" cy="142" r="3" fill="#EF5350" />
                    <circle cx="302" cy="145" r="3" fill="#EF5350" />
                    <circle cx="312" cy="142" r="3" fill="#EF5350" />
                  </g>
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-0.5 pb-2 overflow-hidden justify-between">
                <div>
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-center mb-3 leading-tight">
                    Quelle est votre situation amoureuse ?
                  </h1>

                  {/* Scrollable Relationship Options */}
                  <div className="space-y-1.5 max-h-[260px] md:max-h-[300px] overflow-y-auto scrollbar-hide pr-1 pb-2">
                    {relationshipOptions.map((opt) => {
                      const isSelected = relationshipStatus === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRelationshipStatus(opt.id)}
                          className={`w-full h-[40px] px-3.5 rounded-[14px] flex items-center justify-between text-left transition-all duration-150 border ${
                            isSelected 
                              ? 'bg-[#EFE5FF] border-[#D4C3FC] text-black shadow-sm' 
                              : 'bg-[#F5F5F5] hover:bg-gray-100 border-transparent text-black/80'
                          }`}
                        >
                          <span className={`text-[13px] ${isSelected ? 'font-bold text-black' : 'font-semibold'}`}>
                            {opt.label}
                          </span>
                          
                          {/* Radio circle */}
                          <div className={`w-[17px] h-[17px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected 
                              ? 'border-black bg-white' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && (
                              <div className="w-[8px] h-[8px] rounded-full bg-black" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to submit the entire quiz */}
                  <button
                    type="button"
                    onClick={handleSubmitStep5}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 6 ? (
            <motion.div 
              key="step6"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Notebook Illustration */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 300" className="w-full max-h-[130px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Open Book Cover / base pages */}
                  <path d="M40 240 C120 240, 180 260, 200 280 C220 260, 280 240, 360 240 L350 250 C280 250, 220 270, 200 290 C180 270, 120 250, 50 250 Z" fill="#E0E0E0" />
                  <path d="M40 240 C120 240, 180 260, 200 280 C220 260, 280 240, 360 240 L360 215 C280 215, 220 235, 200 255 C180 235, 120 215, 40 215 Z" fill="#F9A825" opacity="0.9" />

                  {/* Left Page (Profile facing left) */}
                  <path d="M200 80 C180 80, 150 90, 130 110 C120 120, 110 135, 110 145 C110 155, 115 160, 105 165 C95 170, 90 175, 95 180 C95 185, 115 190, 125 195 L145 220 L200 220 Z" fill="#D1C4E9" />
                  <path d="M140 120 C145 115, 155 115, 160 120 C165 115, 175 115, 180 120 C185 125, 185 135, 180 140 L140 140 Z" fill="white" opacity="0.7" />
                  <path d="M125 160 C130 155, 140 155, 145 160 C150 155, 160 155, 165 160 C170 165, 170 175, 165 180 L125 180 Z" fill="white" opacity="0.6" />

                  {/* Right Page (Profile facing right) */}
                  <path d="M200 80 C220 80, 250 90, 270 110 C280 120, 290 135, 290 145 C290 155, 285 160, 295 165 C305 170, 310 175, 305 180 C305 185, 285 190, 275 195 L255 220 L200 220 Z" fill="#D1C4E9" />
                  <rect x="235" y="145" width="45" height="25" rx="3" fill="white" stroke="#EF5350" strokeWidth="2" />
                  <rect x="235" y="145" width="45" height="6" fill="#EF5350" />
                  <path d="M242 159 H273 M242 164 H265" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                  <ellipse cx="265" cy="120" rx="8" ry="5" fill="white" />
                  <circle cx="265" cy="120" r="2.5" fill="black" />

                  {/* Spiral Binder */}
                  <line x1="200" y1="80" x2="200" y2="225" stroke="#7E57C2" strokeWidth="3" />
                  <path d="M195 90 C190 90, 190 100, 200 100 C210 100, 210 90, 205 90" stroke="#FFCA28" strokeWidth="3.5" fill="none" />
                  <path d="M195 110 C190 110, 190 120, 200 120 C210 120, 210 110, 205 110" stroke="#FFCA28" strokeWidth="3.5" fill="none" />
                  <path d="M195 130 C190 130, 190 140, 200 140 C210 140, 210 130, 205 130" stroke="#FFCA28" strokeWidth="3.5" fill="none" />
                  <path d="M195 150 C190 150, 190 160, 200 160 C210 160, 210 150, 205 150" stroke="#FFCA28" strokeWidth="3.5" fill="none" />
                  <path d="M195 170 C190 170, 190 180, 200 180 C210 180, 210 170, 205 170" stroke="#FFCA28" strokeWidth="3.5" fill="none" />
                  <path d="M195 190 C190 190, 190 200, 200 200 C210 200, 210 190, 205 190" stroke="#FFCA28" strokeWidth="3.5" fill="none" />
                  <path d="M195 210 C190 210, 190 220, 200 220 C210 220, 210 210, 205 210" stroke="#FFCA28" strokeWidth="3.5" fill="none" />

                  <path d="M115 220 L125 195 C145 220, 185 220, 200 220 C215 220, 255 220, 275 195 L285 220 Z" fill="#B39DDB" opacity="0.5" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-0.5 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-center mb-4 leading-tight">
                    Rédigez une bio pour vous présenter
                  </h1>

                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="text-[12.5px] font-bold text-gray-800 mb-1.5 self-start">
                      Saisir une bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 500))}
                      placeholder="Parle-nous de toi, de tes passions, de ce que tu recherches..."
                      className="w-full flex-1 min-h-[120px] max-h-[220px] p-3.5 rounded-[16px] border border-gray-200 focus:border-[#B39DDB] focus:ring-2 focus:ring-[#B39DDB]/30 bg-[#FBFBFB] text-[13.5px] text-black outline-none transition-all resize-none font-medium leading-relaxed"
                    />
                    <div className="text-right text-[11px] font-bold text-gray-500 mt-1.5">
                      {bio.length}/500
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to submit everything */}
                  <button
                    type="button"
                    onClick={handleSubmitStep6}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 7 ? (
            <motion.div 
              key="step7"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* House Illustration (Volet 4) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[130px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Chimney on the right of the roof */}
                  <rect x="270" y="55" width="28" height="60" fill="#E0E0E0" rx="3" />
                  <rect x="266" y="50" width="36" height="10" fill="#757575" rx="2" />
                  
                  {/* Hand waving from chimney */}
                  <path d="M284 50 C284 35, 275 30, 260 25 C250 21, 245 23, 248 18 C251 13, 260 17, 270 20 C275 14, 282 12, 286 18 C290 12, 296 14, 296 22 L290 50 Z" fill="#8D6E63" />

                  {/* House body (lavender) */}
                  <path d="M100 130 L300 130 L300 240 L100 240 Z" fill="#D1C4E9" />
                  
                  {/* House front gable/peak */}
                  <path d="M100 130 L200 70 L300 130 Z" fill="#D1C4E9" />
                  <path d="M110 130 L200 76 L290 130 Z" fill="white" opacity="0.3" />

                  {/* Red roof on top of house body */}
                  <path d="M80 135 L200 60 L320 135 L305 142 L200 78 L95 142 Z" fill="#EF5350" />

                  {/* Small circle window in the gable */}
                  <circle cx="200" cy="105" r="12" stroke="black" strokeWidth="2.5" fill="white" />

                  {/* Front door - brown frame, open doors */}
                  <rect x="160" y="150" width="80" height="90" fill="#5D4037" rx="2" />
                  {/* Inside the door: Striped curtains */}
                  <rect x="168" y="155" width="64" height="85" fill="#E0F7FA" />
                  {/* Purple/white striped curtains */}
                  <rect x="168" y="155" width="16" height="85" fill="#AB47BC" />
                  <rect x="184" y="155" width="12" height="85" fill="#E0F7FA" />
                  <rect x="196" y="155" width="8" height="85" fill="#AB47BC" />
                  <rect x="204" y="155" width="12" height="85" fill="#E0F7FA" />
                  <rect x="216" y="155" width="16" height="85" fill="#AB47BC" />
                  {/* Feet sticking out at the bottom of the curtains */}
                  <rect x="190" y="232" width="10" height="8" rx="2" fill="#FFE082" />
                  <rect x="202" y="232" width="10" height="8" rx="2" fill="#FFE082" />
                  <circle cx="192" cy="232" r="1.5" fill="#EF5350" />
                  <circle cx="195" cy="232" r="1.5" fill="#EF5350" />
                  <circle cx="204" cy="232" r="1.5" fill="#EF5350" />
                  <circle cx="207" cy="232" r="1.5" fill="#EF5350" />

                  {/* Left & Right open brown door panels */}
                  <rect x="135" y="150" width="25" height="90" fill="#3E2723" rx="1" />
                  <line x1="142" y1="160" x2="142" y2="230" stroke="#5D4037" strokeWidth="2" />
                  <line x1="149" y1="160" x2="149" y2="230" stroke="#5D4037" strokeWidth="2" />
                  
                  <rect x="240" y="150" width="25" height="90" fill="#3E2723" rx="1" />
                  <line x1="247" y1="160" x2="247" y2="230" stroke="#5D4037" strokeWidth="2" />
                  <line x1="254" y1="160" x2="254" y2="230" stroke="#5D4037" strokeWidth="2" />

                  {/* Window on the right showing people */}
                  <rect x="270" y="150" width="40" height="65" fill="#0288D1" rx="4" stroke="black" strokeWidth="2.5" />
                  {/* Window pane divider */}
                  <line x1="270" y1="182" x2="310" y2="182" stroke="black" strokeWidth="2" />
                  <line x1="290" y1="150" x2="290" y2="215" stroke="black" strokeWidth="2" />
                  
                  {/* People silhouettes in the window */}
                  {/* Person 1 (facing right) */}
                  <path d="M274 182 C274 172, 280 168, 285 168 C287 168, 288 170, 288 172 C288 178, 282 182, 274 182 Z" fill="#FFE082" />
                  {/* Person 2 (facing left) */}
                  <path d="M306 182 C306 170, 298 165, 294 165 C292 165, 292 168, 292 170 C292 176, 298 182, 306 182 Z" fill="#8D6E63" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-0.5 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-center mb-4 leading-tight">
                    Quelle est votre taille ?
                  </h1>

                  {/* Height Interactive Selector Card */}
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    {/* Value text and Unit Toggle row */}
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[24px] font-[900] text-black tracking-tight select-none">
                        {heightNotSay ? '-' : (isCm ? `${heightValue} cm` : formatFeetInches(heightValue))}
                      </span>
                      
                      {/* Unit switcher with circular arrows icon */}
                      <button 
                        type="button"
                        onClick={() => setIsCm(!isCm)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-full border border-gray-200 shadow-sm bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                        <span className="text-[12px] font-extrabold text-gray-800 uppercase">{isCm ? 'cm' : 'ft'}</span>
                      </button>
                    </div>

                    {/* Horizontal Slider */}
                    <div className="relative pt-3 pb-1">
                      <input 
                        type="range"
                        min="130"
                        max="220"
                        value={heightValue}
                        onChange={(e) => {
                          setHeightValue(parseInt(e.target.value, 10));
                          setHeightNotSay(false);
                        }}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-black"
                        style={{
                          background: `linear-gradient(to right, #000 0%, #000 ${((heightValue - 130) / (220 - 130)) * 100}%, #e5e7eb ${((heightValue - 130) / (220 - 130)) * 100}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>

                    {/* "Je préfère ne pas le dire" toggle button option */}
                    <button
                      type="button"
                      onClick={() => setHeightNotSay(!heightNotSay)}
                      className={`w-full py-2.5 px-3.5 rounded-xl text-left transition-all duration-200 border flex items-center justify-between ${
                        heightNotSay 
                          ? 'bg-[#EFE5FF] border-[#D4C3FC] text-black shadow-sm' 
                          : 'bg-gray-50 hover:bg-gray-100 border-transparent text-gray-800'
                      }`}
                    >
                      <span className="text-[13px] font-bold">Je préfère ne pas le dire</span>
                      
                      {/* Radio button circle */}
                      <div className={`w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        heightNotSay 
                          ? 'border-black bg-white' 
                          : 'border-gray-300 bg-white'
                      }`}>
                        {heightNotSay && (
                          <div className="w-[8px] h-[8px] rounded-full bg-black" />
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(6)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to submit everything */}
                  <button
                    type="button"
                    onClick={handleSubmitStep7}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 8 ? (
            <motion.div 
              key="step8"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(7)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Education Illustration (Volet 5) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Purple Glasses */}
                  <circle cx="80" cy="200" r="35" fill="none" stroke="#212121" strokeWidth="16" />
                  <circle cx="160" cy="200" r="35" fill="none" stroke="#212121" strokeWidth="16" />
                  <path d="M115 200 L125 200" stroke="#212121" strokeWidth="10" />
                  <path d="M195 200 C210 200, 220 200, 230 200" stroke="#212121" strokeWidth="12" />
                  {/* Glare in glasses */}
                  <path d="M60 185 L95 215" stroke="#FFF9C4" strokeWidth="6" />
                  <path d="M140 185 L175 215" stroke="#FFF9C4" strokeWidth="6" />

                  {/* Stacked Books */}
                  {/* Bottom Red Book */}
                  <rect x="180" y="165" width="200" height="45" fill="#D50000" rx="4" />
                  {/* Middle Yellow Book */}
                  <rect x="250" y="165" width="130" height="45" fill="#FFEE58" rx="4" />
                  <rect x="280" y="180" width="80" height="6" fill="#F9A825" />
                  <rect x="280" y="192" width="60" height="6" fill="#F9A825" />
                  
                  {/* Top Purple Book */}
                  <rect x="160" y="125" width="160" height="40" fill="#E1BEE7" rx="4" />
                  <rect x="180" y="138" width="60" height="5" fill="#4A148C" />
                  <rect x="180" y="148" width="40" height="5" fill="#4A148C" />
                  
                  {/* Light Purple Book behind */}
                  <rect x="150" y="100" width="150" height="25" fill="#F3E5F5" rx="4" />
                  
                  {/* Pencil (Right side leaning) */}
                  <g transform="rotate(30 350 140)">
                    <path d="M330 180 L350 180 L340 220 Z" fill="#EF5350" />
                    <rect x="330" y="60" width="20" height="120" fill="#FFCA28" />
                    <rect x="330" y="50" width="20" height="10" fill="#E0E0E0" />
                    <path d="M330 40 Q340 30 350 40 L350 50 L330 50 Z" fill="#EF9A9A" />
                  </g>
                  
                  {/* Red Apple */}
                  <path d="M310 130 C280 130, 280 90, 310 90 C340 90, 340 130, 310 130 Z" fill="#D50000" />
                  <path d="M305 92 Q310 70 320 80" fill="none" stroke="#795548" strokeWidth="4" />

                  {/* Graduation Cap */}
                  <path d="M120 70 L200 40 L280 70 L200 100 Z" fill="#E1BEE7" />
                  <rect x="160" y="90" width="80" height="25" fill="#CE93D8" />
                  <path d="M120 70 L120 120 L130 130 L135 120" fill="none" stroke="#FFCA28" strokeWidth="3" />
                  <circle cx="130" cy="130" r="5" fill="#FFCA28" />
                  <circle cx="200" cy="70" r="4" fill="#9C27B0" />
                  
                  {/* Dots / Texture on red book */}
                  <circle cx="210" cy="180" r="1.5" fill="black" opacity="0.3" />
                  <circle cx="215" cy="190" r="1.5" fill="black" opacity="0.3" />
                  <circle cx="225" cy="175" r="1.5" fill="black" opacity="0.3" />
                  <circle cx="230" cy="195" r="1.5" fill="black" opacity="0.3" />
                  <circle cx="240" cy="185" r="1.5" fill="black" opacity="0.3" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Où as-tu étudié ?
                  </h1>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wide">École ou université</label>
                      <input
                        type="text"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder=""
                        className="w-full bg-white border border-gray-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-black transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(7)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to submit everything */}
                  <button
                    type="button"
                    onClick={handleSubmitStep8}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 9 ? (
            <motion.div 
              key="step9"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(8)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Work Illustration (Volet 6) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Many arms character holding things */}
                  {/* Laptop */}
                  <rect x="50" y="160" width="70" height="50" fill="#E1BEE7" rx="4" transform="rotate(-15 50 160)" />
                  <path d="M70 180 L80 190 L90 180 Z" fill="#D50000" transform="rotate(-15 70 180)" />
                  <path d="M70 180 C70 170, 80 170, 80 180" fill="#D50000" transform="rotate(-15 70 180)" />
                  <path d="M80 180 C80 170, 90 170, 90 180" fill="#D50000" transform="rotate(-15 70 180)" />
                  
                  {/* Person body */}
                  <path d="M150 220 L250 220 L240 130 L160 130 Z" fill="#E1BEE7" />
                  <path d="M200 130 L200 220" stroke="#4A148C" strokeWidth="2" strokeDasharray="4 4" />
                  
                  {/* Arms */}
                  <path d="M165 140 Q100 130 110 70" fill="none" stroke="#E1BEE7" strokeWidth="20" strokeLinecap="round" />
                  <path d="M160 160 Q120 180 100 230" fill="none" stroke="#E1BEE7" strokeWidth="20" strokeLinecap="round" />
                  <path d="M165 190 Q120 220 110 180" fill="none" stroke="#E1BEE7" strokeWidth="20" strokeLinecap="round" />

                  <path d="M235 140 Q300 130 290 70" fill="none" stroke="#E1BEE7" strokeWidth="20" strokeLinecap="round" />
                  <path d="M240 160 Q280 180 300 230" fill="none" stroke="#E1BEE7" strokeWidth="20" strokeLinecap="round" />
                  <path d="M235 190 Q280 220 290 180" fill="none" stroke="#E1BEE7" strokeWidth="20" strokeLinecap="round" />

                  {/* Hands */}
                  <circle cx="110" cy="70" r="12" fill="#FFCC80" />
                  <circle cx="100" cy="230" r="12" fill="#FFCC80" />
                  <circle cx="110" cy="180" r="12" fill="#FFCC80" />
                  <circle cx="290" cy="70" r="12" fill="#FFCC80" />
                  <circle cx="300" cy="230" r="12" fill="#FFCC80" />
                  <circle cx="290" cy="180" r="12" fill="#FFCC80" />

                  {/* Objects */}
                  {/* Mug */}
                  <rect x="90" y="30" width="30" height="40" fill="#212121" rx="4" transform="rotate(-30 90 30)" />
                  <path d="M120 40 Q130 40 130 50 Q130 60 120 60" fill="none" stroke="#212121" strokeWidth="4" transform="rotate(-30 90 30)" />
                  
                  {/* Pencil */}
                  <path d="M95 190 L105 190 L100 160 Z" fill="#FFCA28" />
                  <path d="M95 190 L105 190 L100 220 Z" fill="#EF5350" />

                  {/* Hotdog */}
                  <path d="M270 40 Q290 20 310 40" fill="#F4A460" stroke="#F4A460" strokeWidth="10" strokeLinecap="round" transform="rotate(20 290 40)" />
                  <path d="M275 35 Q290 25 305 35" fill="#8B4513" stroke="#8B4513" strokeWidth="6" strokeLinecap="round" transform="rotate(20 290 40)" />
                  <path d="M280 30 Q290 20 300 30" fill="#FFD700" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" transform="rotate(20 290 40)" />
                  
                  {/* Clipboard */}
                  <rect x="290" y="110" width="50" height="70" fill="#5C6BC0" rx="4" transform="rotate(15 290 110)" />
                  <rect x="300" y="120" width="30" height="4" fill="#E8EAF6" transform="rotate(15 290 110)" />
                  <rect x="300" y="130" width="30" height="4" fill="#E8EAF6" transform="rotate(15 290 110)" />
                  <rect x="300" y="140" width="30" height="4" fill="#E8EAF6" transform="rotate(15 290 110)" />
                  
                  {/* OK Sign hand detail */}
                  <circle cx="310" cy="225" r="5" fill="none" stroke="#EF6C00" strokeWidth="2" />
                  
                  {/* Head & Face */}
                  <path d="M185 80 Q200 60 215 80 L210 110 L190 110 Z" fill="#FFCC80" />
                  <path d="M180 70 Q200 40 220 70 Q210 50 180 70 Z" fill="#5D4037" />
                  {/* Glasses */}
                  <circle cx="195" cy="85" r="6" fill="none" stroke="#D50000" strokeWidth="2" />
                  <circle cx="210" cy="85" r="6" fill="none" stroke="#D50000" strokeWidth="2" />
                  <path d="M201 85 L204 85" stroke="#D50000" strokeWidth="2" />
                  
                  <path d="M200 100 Q205 105 210 100" fill="none" stroke="#D50000" strokeWidth="2" />
                  <circle cx="195" cy="85" r="1.5" fill="black" />
                  <path d="M208 85 Q210 82 212 85" fill="none" stroke="black" strokeWidth="1.5" />
                  
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Que faites-vous dans la vie ?
                  </h1>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Intitulé du poste</label>
                      <input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder=""
                        className="w-full bg-white border border-gray-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-black transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wide">Nom de l'entreprise</label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder=""
                        className="w-full bg-white border border-gray-300 focus:bg-white rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-neutral-800 placeholder-neutral-400 outline-none focus:border-black transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(8)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to submit everything */}
                  <button
                    type="button"
                    onClick={handleSubmitStep9}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 10 ? (
            <motion.div 
              key="step10"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(9)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Drink Illustration (Volet 7) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Purple liquid splash bottom */}
                  <path d="M50 250 Q100 200 130 250 Q180 230 200 280 Q250 240 280 270 Q320 250 350 270 L350 280 L50 280 Z" fill="#B39DDB" />
                  <path d="M60 210 Q90 180 120 220 Q160 200 200 240 Q240 210 260 250 Q290 230 310 250 L310 280 L60 280 Z" fill="#9575CD" opacity="0.5" />
                  
                  <path d="M70 190 Q90 140 100 180" fill="none" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                  
                  {/* Cocktail Glass */}
                  <path d="M180 130 L280 150 L240 240 L210 230 Z" fill="#E1BEE7" />
                  <path d="M210 230 L230 280 L190 270 Z" fill="#D1C4E9" />
                  
                  {/* Glass rim */}
                  <path d="M180 130 Q230 160 280 150" fill="none" stroke="#E1BEE7" strokeWidth="4" />
                  <path d="M180 130 Q220 110 280 150" fill="none" stroke="#E1BEE7" strokeWidth="4" />
                  
                  {/* Red Drink inside */}
                  <path d="M190 140 Q230 170 270 150 L240 220 L210 210 Z" fill="#D50000" />
                  <path d="M190 140 Q225 155 270 150 Q225 125 190 140 Z" fill="#EF5350" />
                  
                  {/* Cherry */}
                  <circle cx="215" cy="120" r="15" fill="#B71C1C" />
                  <path d="M215 105 Q225 80 250 90" fill="none" stroke="#388E3C" strokeWidth="3" />
                  
                  {/* Straw */}
                  <path d="M260 160 L240 50 L280 30" fill="none" stroke="#FFCA28" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Lemon slice in splash */}
                  <path d="M150 250 A 40 40 0 0 1 210 230" fill="#FFEE58" stroke="#FBC02D" strokeWidth="4" />
                  <path d="M180 240 L160 230" stroke="#FBC02D" strokeWidth="3" />
                  <path d="M180 240 L190 215" stroke="#FBC02D" strokeWidth="3" />
                  <path d="M180 240 L200 255" stroke="#FBC02D" strokeWidth="3" />
                  
                  {/* Red splashes */}
                  <path d="M140 100 Q160 130 170 110 Z" fill="#D50000" />
                  <path d="M120 70 Q140 60 150 90 Q120 100 120 70 Z" fill="#D50000" />
                  <path d="M130 150 Q160 140 140 170 Q120 180 130 150 Z" fill="#D50000" />
                  <circle cx="160" cy="180" r="5" fill="#D50000" />
                  <circle cx="110" cy="130" r="6" fill="#D50000" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Est-ce que vous buvez ?
                  </h1>

                  <div className="space-y-2 overflow-y-auto no-scrollbar pb-3" style={{ maxHeight: '55vh' }}>
                    {drinkingOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDrinking(option.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          drinking === option.id
                            ? 'bg-[#EFE5FF]/40 border-transparent shadow-sm'
                            : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <span className={`text-[13.5px] font-bold ${drinking === option.id ? 'text-black' : 'text-neutral-800'}`}>
                          {option.label}
                        </span>
                        <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                          drinking === option.id ? 'border-black' : 'border-neutral-400'
                        }`}>
                          {drinking === option.id && (
                            <div className="w-[8px] h-[8px] bg-black rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(9)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to step 11 */}
                  <button
                    type="button"
                    onClick={handleSubmitStep10}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 11 ? (
            <motion.div 
              key="step11"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(10)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Smoking Illustration (Volet 8) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Purple smoke/magic dust */}
                  <path d="M160 50 Q100 40 120 90 Q140 140 180 100 Q200 80 180 60 Z" fill="#E1BEE7" />
                  <path d="M120 140 Q100 130 110 160 Q120 190 150 170 Q180 150 160 140 Z" fill="#E1BEE7" />
                  <path d="M220 120 Q180 140 200 180 Q220 220 260 200 Q280 180 250 150 Z" fill="#E1BEE7" opacity="0.7" />
                  
                  {/* Dark smoke particles */}
                  <path d="M190 60 Q210 40 240 60 Q260 80 250 110" fill="none" stroke="#212121" strokeWidth="8" strokeDasharray="4 8" strokeLinecap="round" />
                  <path d="M210 80 Q230 70 250 90" fill="none" stroke="#424242" strokeWidth="6" strokeDasharray="2 6" strokeLinecap="round" />
                  
                  {/* Ashtray */}
                  <ellipse cx="140" cy="220" rx="60" ry="25" fill="#212121" />
                  <ellipse cx="140" cy="215" rx="50" ry="20" fill="#424242" />
                  
                  <path d="M120 220 Q140 240 160 220" fill="none" stroke="#E1BEE7" strokeWidth="15" strokeLinecap="round" />
                  <path d="M130 220 Q140 230 150 220" fill="none" stroke="#FFF" strokeWidth="5" strokeLinecap="round" />
                  
                  {/* Divots in ashtray */}
                  <path d="M85 215 Q95 210 105 220" fill="none" stroke="#212121" strokeWidth="6" strokeLinecap="round" />
                  <path d="M175 215 Q185 210 195 220" fill="none" stroke="#212121" strokeWidth="6" strokeLinecap="round" />
                  <path d="M130 240 Q140 235 150 240" fill="none" stroke="#212121" strokeWidth="4" strokeLinecap="round" />

                  {/* Sparkles */}
                  <path d="M120 70 L125 75 L130 70 L125 65 Z" fill="#FFF" />
                  <path d="M140 150 L143 153 L146 150 L143 147 Z" fill="#FFF" />
                  <path d="M160 210 L162 212 L164 210 L162 208 Z" fill="#FFF" />

                  {/* Sleeve */}
                  <path d="M240 280 L310 280 L300 230 L230 230 Z" fill="#D50000" />
                  <path d="M245 280 L235 230 M265 280 L255 230 M285 280 L275 230 M305 280 L295 230" stroke="#B71C1C" strokeWidth="4" />

                  {/* Hand base */}
                  <path d="M240 230 Q230 180 260 140 Q280 120 300 140 L310 230 Z" fill="#F4A460" />
                  
                  {/* Fingers */}
                  {/* Pinky */}
                  <path d="M300 140 Q330 130 330 150 Q330 160 300 170" fill="#F4A460" />
                  {/* Ring finger */}
                  <path d="M290 130 Q340 100 340 120 Q340 140 290 155" fill="#F4A460" />
                  {/* Middle finger */}
                  <path d="M275 125 Q325 80 330 100 Q335 120 280 145" fill="#F4A460" />
                  {/* Index finger holding */}
                  <path d="M260 140 Q250 80 270 70 Q280 60 290 80 Q290 100 270 120" fill="#F4A460" />
                  
                  {/* Thumb crossing over */}
                  <path d="M230 180 Q250 150 280 150 Q295 150 285 170 Q270 190 240 200" fill="#E28743" />
                  
                  {/* Blue Nails */}
                  <path d="M325 145 Q335 145 330 152" fill="#0288D1" />
                  <path d="M335 110 Q345 110 340 120" fill="#0288D1" />
                  <path d="M325 90 Q335 90 330 100" fill="#0288D1" />
                  <path d="M265 72 Q275 68 275 75" fill="#0288D1" />

                  {/* Ring */}
                  <path d="M285 150 L275 160" stroke="#FFD700" strokeWidth="4" />
                  <circle cx="280" cy="155" r="4" fill="#D50000" />
                  
                  {/* Cigarette / Object being smoked */}
                  <path d="M265 95 L200 95 L190 105 L255 105 Z" fill="#424242" />
                  <path d="M190 105 L180 105 L185 95 L195 95 Z" fill="#E0E0E0" />
                  <circle cx="185" cy="100" r="3" fill="#FF5252" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Est-ce que vous fumez ?
                  </h1>

                  <div className="space-y-2 overflow-y-auto no-scrollbar pb-3" style={{ maxHeight: '55vh' }}>
                    {smokingOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSmoking(option.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          smoking === option.id
                            ? 'bg-[#EFE5FF]/40 border-transparent shadow-sm'
                            : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <span className={`text-[13.5px] font-bold ${smoking === option.id ? 'text-black' : 'text-neutral-800'}`}>
                          {option.label}
                        </span>
                        <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                          smoking === option.id ? 'border-black' : 'border-neutral-400'
                        }`}>
                          {smoking === option.id && (
                            <div className="w-[8px] h-[8px] bg-black rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(10)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to step 12 */}
                  <button
                    type="button"
                    onClick={handleSubmitStep11}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 12 ? (
            <motion.div 
              key="step12"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(11)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Kids Illustration (Volet 9) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Purple block */}
                  <path d="M140 180 L180 180 L180 230 L140 230 Z" fill="#9C27B0" />
                  {/* Red block */}
                  <path d="M70 190 L150 190 L150 240 L70 240 Z" fill="#C62828" />
                  {/* Yellow block */}
                  <path d="M60 150 L130 150 L130 190 L60 190 Z" fill="#FDD835" />
                  <path d="M65 140 L85 140 L85 150 L65 150 Z" fill="#FDD835" />
                  <path d="M100 140 L120 140 L120 150 L100 150 Z" fill="#FDD835" />
                  
                  {/* Castle blocks */}
                  <path d="M280 150 L340 150 L340 220 L280 220 Z" fill="#880E4F" />
                  <path d="M280 130 L295 130 L295 150 L280 150 Z" fill="#880E4F" />
                  <path d="M305 130 L320 130 L320 150 L305 150 Z" fill="#880E4F" />
                  <path d="M330 130 L345 130 L345 150 L330 150 Z" fill="#880E4F" />

                  {/* Rubber Duck */}
                  <path d="M260 210 Q240 210 240 230 Q240 250 270 250 L310 250 Q330 250 330 230 Q330 210 300 210 Z" fill="#FFCA28" />
                  <circle cx="310" cy="190" r="20" fill="#FFCA28" />
                  <circle cx="315" cy="185" r="4" fill="#212121" />
                  <path d="M325 190 L345 195 L325 200 Z" fill="#D84315" />
                  <path d="M250 230 Q260 240 280 230" fill="none" stroke="#FFA000" strokeWidth="4" strokeLinecap="round" />

                  {/* Robot */}
                  {/* Antenna */}
                  <path d="M200 60 L200 40" stroke="#E1BEE7" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="200" cy="35" r="6" fill="#9C27B0" />
                  
                  {/* Head */}
                  <path d="M160 60 L240 60 L240 120 L160 120 Z" fill="#D1C4E9" />
                  <path d="M145 70 L160 70 L160 100 L145 100 Z" fill="#E1BEE7" />
                  <path d="M240 70 L255 70 L255 100 L245 100 Z" fill="#E1BEE7" />
                  
                  {/* Eyes */}
                  <circle cx="185" cy="85" r="8" fill="#212121" />
                  <circle cx="215" cy="85" r="8" fill="#212121" />
                  <path d="M175 75 L195 80" stroke="#212121" strokeWidth="4" strokeLinecap="round" />
                  <path d="M225 75 L205 80" stroke="#212121" strokeWidth="4" strokeLinecap="round" />
                  
                  {/* Mouth */}
                  <path d="M175 105 L225 105 L225 115 L175 115 Z" fill="#FFF" />
                  <path d="M185 105 L185 115 M195 105 L195 115 M205 105 L205 115 M215 105 L215 115" stroke="#212121" strokeWidth="2" />
                  
                  {/* Neck */}
                  <path d="M190 120 L210 120 L210 130 L190 130 Z" fill="#B39DDB" />
                  
                  {/* Body */}
                  <path d="M160 130 L240 130 L230 200 L170 200 Z" fill="#E1BEE7" />
                  
                  {/* Body details */}
                  <circle cx="185" cy="150" r="6" fill="#D50000" />
                  <circle cx="205" cy="150" r="6" fill="#D50000" />
                  <circle cx="185" cy="170" r="6" fill="#D50000" />
                  <circle cx="205" cy="170" r="6" fill="#D50000" />
                  <path d="M170 190 L230 190" stroke="#212121" strokeWidth="20" strokeLinecap="round" />
                  
                  {/* Left Arm */}
                  <path d="M165 140 L135 180" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                  <path d="M135 180 L145 220" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                  {/* Claw Left */}
                  <path d="M135 220 Q120 230 135 240 Q150 230 155 220" fill="none" stroke="#D1C4E9" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Right Arm */}
                  <path d="M235 140 L265 180" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                  <path d="M265 180 L250 220" stroke="#B39DDB" strokeWidth="15" strokeLinecap="round" />
                  {/* Claw Right */}
                  <path d="M260 220 Q275 230 260 240 Q245 230 240 220" fill="none" stroke="#D1C4E9" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Legs */}
                  <path d="M185 200 L185 240" stroke="#B39DDB" strokeWidth="12" strokeDasharray="5 5" />
                  <path d="M215 200 L215 240" stroke="#B39DDB" strokeWidth="12" strokeDasharray="5 5" />
                  
                  {/* Feet */}
                  <path d="M165 240 L195 240 L195 250 L165 250 Z" fill="#D1C4E9" />
                  <path d="M205 240 L235 240 L235 250 L205 250 Z" fill="#D1C4E9" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Envie d'avoir des enfants ?
                  </h1>

                  <div className="space-y-2 overflow-y-auto no-scrollbar pb-3" style={{ maxHeight: '55vh' }}>
                    {kidsOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setKids(option.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          kids === option.id
                            ? 'bg-[#EFE5FF]/40 border-transparent shadow-sm'
                            : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <span className={`text-[13.5px] font-bold ${kids === option.id ? 'text-black' : 'text-neutral-800'}`}>
                          {option.label}
                        </span>
                        <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                          kids === option.id ? 'border-black' : 'border-neutral-400'
                        }`}>
                          {kids === option.id && (
                            <div className="w-[8px] h-[8px] bg-black rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(11)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to step 16 */}
                  <button
                    type="button"
                    onClick={handleSubmitStep12}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 13 ? (
            <motion.div 
              key="step13"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(12)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Education Level Illustration (Volet 10) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Graduation cap */}
                  <path d="M110 90 L200 60 L290 90 L200 120 Z" fill="#D1C4E9" />
                  <path d="M140 100 L140 130 Q200 160 260 130 L260 100" fill="none" stroke="#B39DDB" strokeWidth="8" strokeLinecap="round" />
                  <path d="M130 90 L110 160" stroke="#FFCA28" strokeWidth="4" />
                  <circle cx="110" cy="165" r="8" fill="#FFCA28" />
                  <path d="M105 165 L100 185 L120 185 L115 165 Z" fill="#FFCA28" />

                  {/* Books */}
                  <path d="M140 230 L320 230 L320 280 L140 280 Z" fill="#D50000" />
                  <path d="M145 240 L315 240 L315 270 L145 270 Z" fill="#FFCA28" />
                  <path d="M160 250 L300 250 M160 260 L300 260" stroke="#212121" strokeWidth="2" />
                  
                  <path d="M120 180 L220 180 L220 230 L120 230 Z" fill="#E1BEE7" />
                  <path d="M125 190 L215 190 L215 220 L125 220 Z" fill="#FFCA28" />
                  <path d="M140 200 L200 200 M140 210 L200 210" stroke="#212121" strokeWidth="2" />

                  {/* Apple */}
                  <path d="M260 180 Q250 140 280 140 Q290 140 300 150 Q310 140 320 140 Q350 140 340 180 Q330 220 300 220 Q270 220 260 180 Z" fill="#D50000" />
                  <path d="M300 150 Q295 130 310 120" fill="none" stroke="#81C784" strokeWidth="6" strokeLinecap="round" />
                  <path d="M275 155 Q285 145 295 155 Q290 165 275 155 Z" fill="#FF8A80" opacity="0.6" />

                  {/* Pencil */}
                  <path d="M305 115 L365 245 L375 240 L315 110 Z" fill="#FFCA28" />
                  <path d="M365 245 L375 240 L380 265 Z" fill="#F4A460" />
                  <path d="M375 255 L380 265 L372 253 Z" fill="#212121" />
                  <path d="M305 115 L315 110 L320 120 L310 125 Z" fill="#EF5350" />
                  <path d="M312 110 L322 130" stroke="#212121" strokeWidth="2" />

                  {/* Glasses */}
                  <circle cx="100" cy="240" r="30" fill="#FFF" stroke="#212121" strokeWidth="12" />
                  <circle cx="180" cy="240" r="30" fill="#FFF" stroke="#212121" strokeWidth="12" />
                  <path d="M130 240 L150 240" stroke="#212121" strokeWidth="8" strokeLinecap="round" />
                  <path d="M180 210 L195 190" stroke="#212121" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Glasses glare */}
                  <path d="M85 230 L115 250 M100 225 L115 235" stroke="#FFCA28" strokeWidth="3" strokeLinecap="round" />
                  <path d="M165 230 L195 250 M180 225 L195 235" stroke="#FFCA28" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Quel est votre niveau d'études ?
                  </h1>

                  <div className="space-y-2 overflow-y-auto no-scrollbar pb-3" style={{ maxHeight: '55vh' }}>
                    {educationLevelOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setEducationLevel(option.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          educationLevel === option.id
                            ? 'bg-[#EFE5FF]/40 border-transparent shadow-sm'
                            : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <span className={`text-[13.5px] font-bold ${educationLevel === option.id ? 'text-black' : 'text-neutral-800'}`}>
                          {option.label}
                        </span>
                        <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                          educationLevel === option.id ? 'border-black' : 'border-neutral-400'
                        }`}>
                          {educationLevel === option.id && (
                            <div className="w-[8px] h-[8px] bg-black rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(12)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to step 14 */}
                  <button
                    type="button"
                    onClick={handleSubmitStep13}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 14 ? (
            <motion.div 
              key="step14"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Top Close / Back Button (X icon) */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(13)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>

              {/* Personality Illustration (Volet 11) */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Ground */}
                  <path d="M50 240 Q150 200 250 240 Q300 260 350 240 L350 280 L50 280 Z" fill="#8BC34A" />
                  <path d="M80 230 Q120 210 180 240 Q220 260 280 240 Z" fill="#7CB342" />

                  {/* Plants */}
                  <path d="M100 250 Q120 180 150 200" fill="none" stroke="#558B2F" strokeWidth="8" strokeLinecap="round" />
                  <path d="M120 180 Q100 150 80 160 Q60 170 90 200" fill="#B39DDB" stroke="#9C27B0" strokeWidth="2" />
                  <path d="M120 180 Q110 160 90 170" fill="#9C27B0" />
                  
                  {/* Main Flower */}
                  <path d="M180 250 Q200 150 200 150" fill="none" stroke="#558B2F" strokeWidth="10" strokeLinecap="round" />
                  
                  <path d="M180 210 Q250 150 280 230" fill="#8BC34A" />
                  <path d="M180 220 Q220 170 240 220" fill="#7CB342" />
                  
                  <path d="M170 230 Q150 180 130 250" fill="#8BC34A" />
                  <path d="M170 240 Q160 200 150 240" fill="#7CB342" />

                  {/* Petals */}
                  <path d="M200 150 Q160 110 150 140 Q140 170 200 150" fill="#E1BEE7" />
                  <path d="M200 150 Q180 80 200 80 Q220 80 200 150" fill="#D1C4E9" />
                  <path d="M200 150 Q240 110 250 140 Q260 170 200 150" fill="#E1BEE7" />
                  <path d="M200 150 Q170 180 180 190 Q190 200 200 150" fill="#D1C4E9" />
                  <path d="M200 150 Q230 180 220 190 Q210 200 200 150" fill="#D1C4E9" />

                  {/* Flower Center */}
                  <circle cx="200" cy="150" r="15" fill="#FDD835" />
                  <path d="M195 135 L195 115 M205 135 L205 115" stroke="#F57F17" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="195" cy="115" r="3" fill="#FFF" />
                  <circle cx="205" cy="115" r="3" fill="#FFF" />

                  {/* Hand picking flower */}
                  <path d="M350 80 L320 80 L290 120 L310 160 L350 160 Z" fill="#D1C4E9" />
                  <path d="M350 80 L320 80 L290 120 L310 160 L350 160 Z" fill="#D50000" opacity="0.8" stroke="#D50000" strokeWidth="4" strokeDasharray="10 10" />
                  
                  <path d="M300 130 Q280 120 260 120 Q240 120 230 130 Q220 140 220 150 Q220 160 230 160 Q240 160 250 150 Q260 140 280 140" fill="#8D6E63" />
                  <path d="M225 145 L220 145 L220 155 L225 155 Z" fill="#D50000" />
                  <path d="M290 90 Q270 90 250 90 Q210 90 180 100 Q170 105 180 115 Q190 125 210 120 Q250 110 290 110" fill="#8D6E63" />
                  <path d="M175 105 L170 105 L170 115 L175 115 Z" fill="#D50000" />
                  
                  <path d="M270 100 Q250 100 230 110 Q220 115 230 125 Q240 135 260 130" fill="#795548" />
                  
                  <path d="M310 120 L350 120 L350 160 L310 160 Z" fill="#B39DDB" />
                  <path d="M315 125 L345 125 L345 155 L315 155 Z" fill="#9575CD" opacity="0.5" />
                  
                  {/* Sleeve Details */}
                  <path d="M330 125 L330 155" stroke="#D50000" strokeWidth="6" />
                  <path d="M340 125 L340 155" stroke="#D50000" strokeWidth="6" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Êtes-vous plutôt introverti ou extraverti ?
                  </h1>

                  <div className="space-y-2 overflow-y-auto no-scrollbar pb-3" style={{ maxHeight: '55vh' }}>
                    {personalityOptions.map((option) => {
                      const isSelected = personality === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setPersonality(option.id)}
                          className={`w-full text-left px-4 py-3 rounded-[20px] border-none flex items-center justify-between transition-all duration-150 ${
                            isSelected
                              ? 'bg-[#EFE5FF] text-black shadow-sm'
                              : 'bg-[#F4F4F5] text-black hover:bg-[#EAEAEA]'
                          }`}
                        >
                          <span className="text-[13.5px] font-bold text-black">
                            {option.label}
                          </span>
                          <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                            isSelected ? 'border-black bg-white' : 'border-neutral-800 bg-transparent'
                          }`}>
                            {isSelected && (
                              <div className="w-[8px] h-[8px] bg-black rounded-full" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(13)}
                    className="w-12 h-12 rounded-full bg-[#F4F4F5] flex items-center justify-center text-black hover:bg-gray-200 active:scale-[0.96] transition-all"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to step 15 */}
                  <button
                    type="button"
                    onClick={handleSubmitStep14}
                    className="w-12 h-12 rounded-full bg-[#F4F4F5] flex items-center justify-center text-black hover:bg-gray-200 active:scale-[0.96] transition-all"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 15 ? (
            <motion.div 
              key="step15"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(14)}
                  className="w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all border border-gray-100"
                  aria-label="Retour"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col pt-12 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start overflow-hidden">
                  
                  {/* Custom Illustration matching the design precisely */}
                  <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-2 mb-2">
                    <svg viewBox="0 0 400 280" className="w-full max-h-[145px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Yoga Mat */}
                      <path d="M50 215 L350 215 L320 240 L80 240 Z" fill="#EADCF7" opacity="0.8" />
                      
                      {/* Shadow */}
                      <ellipse cx="200" cy="225" rx="110" ry="10" fill="#D2C4E9" opacity="0.5" />

                      {/* Left foot (Skating) */}
                      <g id="skate-leg" transform="translate(110, 160)">
                        <path d="M30 0 L0 45 C-5 50, -10 52, -15 52" stroke="#FCD5B5" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <path d="M30 0 L0 45 C-5 50, -10 52, -15 52" stroke="#B59FF2" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <path d="M-18 45 L-10 45 L-8 55 L-22 55 Z" fill="#FFFFFF" stroke="#CCCCCC" strokeWidth="1" />
                        <path d="M-22 55 L-12 55 L-12 58 L-22 58 Z" fill="#E0E0E0" />
                        <path d="M-26 59 L-8 59" stroke="#90A4AE" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M-24 59 L-24 55 M-10 59 L-10 55" stroke="#90A4AE" strokeWidth="1" />
                      </g>

                      {/* Right leg (Soccer stance) */}
                      <g id="soccer-leg" transform="translate(200, 160)">
                        <path d="M0 0 L40 40 L65 52" stroke="#B59FF2" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <path d="M63 50 C65 48, 72 52, 72 55 C72 57, 65 57, 62 55 Z" fill="#FCD5B5" />
                      </g>

                      {/* Torso & Head */}
                      <g id="torso-head">
                        <path d="M190 70 C175 70, 170 85, 172 95" stroke="#8D4B2A" strokeWidth="12" strokeLinecap="round" />
                        <circle cx="205" cy="80" r="16" fill="#FCD5B5" />
                        <path d="M205 70 C212 70, 218 78, 218 84 C218 85, 202 88, 200 80 Z" fill="#8D4B2A" />
                        <path d="M165 140 L235 140 L210 100 L185 100 Z" fill="#B59FF2" />
                        <path d="M185 100 L210 100 L205 130 L190 130 Z" fill="#8C72D9" />

                        <path d="M185 110 L120 105" stroke="#FCD5B5" strokeWidth="9" strokeLinecap="round" />
                        <g transform="translate(100, 85) rotate(-5)">
                          <rect x="0" y="0" width="22" height="30" rx="2" fill="#1A237E" />
                          <rect x="3" y="2" width="16" height="26" fill="#FFFFFF" />
                          <line x1="5" y1="6" x2="15" y2="6" stroke="#9E9E9E" strokeWidth="1.5" />
                          <line x1="5" y1="12" x2="15" y2="12" stroke="#9E9E9E" strokeWidth="1.5" />
                          <line x1="5" y1="18" x2="12" y2="18" stroke="#9E9E9E" strokeWidth="1.5" />
                        </g>

                        <path d="M210 110 L275 95" stroke="#FCD5B5" strokeWidth="9" strokeLinecap="round" />
                        <g transform="translate(270, 82) rotate(10)">
                          <line x1="0" y1="12" x2="15" y2="2" stroke="#37474F" strokeWidth="2.5" strokeLinecap="round" />
                          <rect x="13" y="1" width="3" height="3" fill="#B0BEC5" />
                          <path d="M16 2 L22 -1 L18 4 Z" fill="#E53935" />
                        </g>
                      </g>

                      {/* Red Electric Guitar */}
                      <g transform="translate(155, 105) rotate(-25)">
                        <rect x="65" y="15" width="45" height="6" fill="#8D4B2A" />
                        <rect x="110" y="13" width="10" height="9" rx="1.5" fill="#FDD835" />
                        <path d="M10 10 C10 -5, 35 -5, 45 5 C50 10, 60 10, 65 15 C70 20, 65 35, 50 35 C40 35, 25 38, 15 30 C5 22, 10 18, 10 10 Z" fill="#E53935" />
                        <path d="M25 15 C28 8, 42 8, 45 15 C45 22, 35 28, 25 22 Z" fill="#FFFFFF" />
                        <rect x="20" y="17" width="8" height="4" fill="#B0BEC5" />
                        <circle cx="35" cy="22" r="2" fill="#FDD835" />
                        <circle cx="41" cy="21" r="2" fill="#FDD835" />
                      </g>

                      {/* Soccer Ball */}
                      <g transform="translate(270, 195)">
                        <circle cx="15" cy="15" r="15" fill="#FFFFFF" stroke="#455A64" strokeWidth="1.5" />
                        <polygon points="15,10 19,13 17,18 13,18 11,13" fill="#37474F" />
                        <line x1="15" y1="10" x2="15" y2="4" stroke="#37474F" strokeWidth="1.5" />
                        <line x1="19" y1="13" x2="24" y2="11" stroke="#37474F" strokeWidth="1.5" />
                        <line x1="17" y1="18" x2="21" y2="23" stroke="#37474F" strokeWidth="1.5" />
                        <line x1="13" y1="18" x2="9" y2="23" stroke="#37474F" strokeWidth="1.5" />
                        <line x1="11" y1="13" x2="6" y2="11" stroke="#37474F" strokeWidth="1.5" />
                        
                        <path d="M15 4 C19 4, 23 6, 24 11" stroke="#37474F" strokeWidth="1.2" />
                        <path d="M24 11 C26 15, 25 19, 21 23" stroke="#37474F" strokeWidth="1.2" />
                        <path d="M21 23 C17 26, 13 26, 9 23" stroke="#37474F" strokeWidth="1.2" />
                        <path d="M9 23 C5 19, 4 15, 6 11" stroke="#37474F" strokeWidth="1.2" />
                        <path d="M6 11 C7 6, 11 4, 15 4" stroke="#37474F" strokeWidth="1.2" />
                      </g>
                    </svg>
                  </div>

                  <div className="px-5 shrink-0">
                    <h1 className="text-[17px] font-[800] tracking-tight text-black text-left mb-1 leading-tight">
                      Qu'est-ce qui vous caractérise ?
                    </h1>
                    <p className="text-[12px] text-neutral-600 mb-3 leading-tight">
                      Choisissez jusqu'à 8 centres d'intérêt. Ils vous aideront à trouver des personnes qui vous ressemblent.
                    </p>
                    
                    <h2 className="text-[12.5px] font-[800] tracking-tight text-black text-left mb-1">
                      Vos centres d'intérêt
                    </h2>
                    <div className="min-h-[38px] mb-3 pb-1.5 border-b border-gray-100 text-[12px] text-neutral-400">
                      {interests.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {interests.map((interest: any, idx: number) => {
                            const isObj = typeof interest === 'object' && interest !== null;
                            const interestLabel = isObj ? (interest.label || interest.name || '') : String(interest);
                            let emoji = isObj && interest.icon ? interest.icon : "✨";
                            if (emoji === "✨") {
                              for (const category of INTERESTS_CATEGORIES) {
                                const found = category.items.find(i => i.label === interestLabel);
                                if (found) {
                                  emoji = found.emoji;
                                  break;
                                }
                              }
                            }
                            return (
                              <button
                                key={`${interestLabel}-${idx}`}
                                type="button"
                                onClick={() => toggleInterest(interestLabel)}
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-black text-white text-[11.5px] font-extrabold active:scale-95 transition-all"
                              >
                                <span className="mr-1">{emoji}</span>
                                {interestLabel}
                                <span className="ml-1 text-[9px] opacity-85">✕</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-neutral-400 font-bold text-[12px] block py-0.5">
                          Dès que vous les choisissez, ils apparaîtront ici.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* List of categories */}
                  <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4 space-y-6">
                    {INTERESTS_CATEGORIES.map((category) => {
                      const isExpanded = expandedCategories[category.title];
                      const itemsToShow = isExpanded ? category.items : category.items.slice(0, 8);
                      const hasMore = category.items.length > 8;

                      return (
                        <div key={category.title}>
                          <h3 className="text-[13px] font-[850] tracking-tight text-black text-left mb-2">
                            {category.title}
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {itemsToShow.map((item, itemIdx) => {
                              const isSelected = interests.includes(item.label);
                              return (
                                <button
                                  key={`${category.title}-${item.label}-${itemIdx}`}
                                  type="button"
                                  onClick={() => toggleInterest(item.label)}
                                  className={`flex items-center px-3 py-1 rounded-full text-[12px] font-bold transition-all active:scale-[0.97] border border-transparent ${
                                    isSelected
                                      ? 'bg-black text-white'
                                      : 'bg-[#F4F4F6] hover:bg-[#EAEAEF] text-black'
                                  }`}
                                >
                                  <span className="mr-1">{item.emoji}</span>
                                  {item.label}
                                  {isSelected ? (
                                    <span className="ml-1 font-bold text-white opacity-90">✕</span>
                                  ) : (
                                    <span className="ml-1 font-normal text-black opacity-50">+</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => setExpandedCategories(prev => ({ ...prev, [category.title]: !isExpanded }))}
                              className="inline-flex items-center text-[12.5px] font-[800] text-neutral-800 hover:text-black mt-2.5 bg-neutral-100 hover:bg-neutral-200/60 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                                  Voir moins
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                                  Voir plus
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="px-5 pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  {/* Back Arrow Button */}
                  <button
                    type="button"
                    onClick={() => setStep(14)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to step 16 */}
                  <button
                    type="button"
                    onClick={handleSubmitStep15}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 16 ? (
            <motion.div 
              key="step16"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Close Button X / Back + Wine Glass Icon Badge */}
              <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setStep(15)}
                    className="w-8 h-8 rounded-full bg-white/95 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all border border-gray-100 cursor-pointer"
                    aria-label="Retour"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 shadow-xs">
                    <span className="text-[14px]">🍷</span>
                  </div>
                </div>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col pt-12 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start overflow-hidden">
                  
                  {/* Custom Illustration matching the screenshot precisely */}
                  <div className="pt-1 px-5 flex justify-center bg-white shrink-0 mb-1">
                    <svg viewBox="0 0 400 240" className="w-full max-h-[135px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Left: Purple Circle with Wine Glass */}
                      <g transform="translate(60, 60)">
                        <circle cx="28" cy="28" r="28" fill="#EFE5FF" />
                        <circle cx="28" cy="28" r="22" fill="#9C27B0" opacity="0.15" />
                        <path d="M20 18 L36 18 L28 30 Z" fill="#9C27B0" />
                        <line x1="28" y1="30" x2="28" y2="38" stroke="#9C27B0" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="22" y1="38" x2="34" y2="38" stroke="#9C27B0" strokeWidth="2.5" strokeLinecap="round" />
                      </g>

                      {/* Center: Hand holding open purple notebook */}
                      <g transform="translate(140, 20)">
                        <rect x="25" y="30" width="100" height="120" rx="12" fill="#7E57C2" />
                        <rect x="30" y="35" width="42" height="110" rx="6" fill="#FFFFFF" />
                        <rect x="78" y="35" width="42" height="110" rx="6" fill="#FFFFFF" />
                        <line x1="75" y1="35" x2="75" y2="145" stroke="#D1C4E9" strokeWidth="2" />
                        <rect x="118" y="45" width="12" height="16" rx="3" fill="#FF5252" />
                        <rect x="118" y="68" width="12" height="16" rx="3" fill="#FFCA28" />
                        <rect x="118" y="91" width="12" height="16" rx="3" fill="#29B6F6" />
                        <line x1="36" y1="50" x2="66" y2="50" stroke="#B39DDB" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="36" y1="62" x2="62" y2="62" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" />
                        <line x1="36" y1="72" x2="68" y2="72" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" />
                        <line x1="36" y1="82" x2="58" y2="82" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" />
                        
                        <line x1="84" y1="50" x2="114" y2="50" stroke="#B39DDB" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="84" y1="62" x2="110" y2="62" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" />
                        <line x1="84" y1="72" x2="112" y2="72" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" />
                        <line x1="84" y1="82" x2="104" y2="82" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" />

                        <path d="M75 140 C75 125, 65 110, 50 115 C38 120, 45 138, 70 145 Z" fill="#FCD5B5" />
                        <circle cx="70" cy="155" r="8" fill="#FFD54F" />
                        <path d="M45 160 L75 160 L70 190 L40 190 Z" fill="#AB47BC" />
                      </g>

                      {/* Right: Red plate with Fork, Knife & Padlock */}
                      <g transform="translate(280, 55)">
                        <circle cx="30" cy="30" r="28" fill="#FFEBEE" />
                        <circle cx="30" cy="30" r="22" fill="#EF5350" opacity="0.2" />
                        <path d="M20 18 L20 28 M17 18 L17 23 M23 18 L23 23" stroke="#D32F2F" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="20" y1="28" x2="20" y2="40" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" />
                        <path d="M40 18 C40 23, 37 26, 37 28 L37 40" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" />
                        <rect x="25" y="27" width="10" height="8" rx="1.5" fill="#D32F2F" />
                        <path d="M27 27 V23 C27 21.5, 33 21.5, 33 23 V27" stroke="#D32F2F" strokeWidth="1.8" fill="none" />
                      </g>
                    </svg>
                  </div>

                  <div className="px-5 text-center shrink-0 mb-2">
                    <h1 className="text-[18px] font-[850] tracking-tight text-black leading-tight mb-0.5">
                      Answer questions
                    </h1>
                    <p className="text-[12px] font-[500] text-gray-500 leading-snug">
                      Your answers help people get to know you!
                    </p>
                  </div>

                  {/* List of prompt questions */}
                  <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-3 space-y-2.5">
                    {PROMPT_QUESTIONS_LIST.map((question) => {
                      let currentAnswer = '';
                      if (prompt1Question === question) currentAnswer = prompt1Answer;
                      else if (prompt2Question === question) currentAnswer = prompt2Answer;
                      else if (prompt3Question === question) currentAnswer = prompt3Answer;

                      const isAnswered = Boolean(currentAnswer);

                      return (
                        <button
                          key={question}
                          type="button"
                          onClick={() => handleOpenPromptModal(question)}
                          className={`w-full text-left p-3.5 rounded-[18px] border transition-all active:scale-[0.98] cursor-pointer ${
                            isAnswered 
                              ? 'bg-[#EFE5FF]/50 border-purple-200 shadow-xs' 
                              : 'bg-[#F4F4F6] hover:bg-[#EAEAEF] border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-[13px] font-[800] text-black leading-snug">
                              {question}
                            </span>
                            {isAnswered ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-extrabold shrink-0">
                                Répondu
                              </span>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-black shrink-0 shadow-xs">
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            )}
                          </div>

                          {isAnswered && (
                            <div className="mt-2.5 pt-2 border-t border-purple-200/60 text-[13.5px] font-semibold text-purple-950 bg-white/90 px-3 py-2 rounded-xl">
                              "{currentAnswer}"
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="px-5 pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep(15)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4 cursor-pointer"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  <button
                    type="button"
                    onClick={handleSubmitStep16}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto cursor-pointer"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 19 ? (
            <motion.div 
              key="step19"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Back Arrow Button */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(16)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Pets Illustration */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Grass background patch */}
                  <path d="M40 230 Q140 190 240 230 Q290 250 360 230 L360 270 L40 270 Z" fill="#8BC34A" />
                  <path d="M70 220 Q110 200 170 230 Q210 250 290 230 Z" fill="#7CB342" />
                  
                  {/* Tiny Grass details */}
                  <path d="M60 225 L62 215 M64 226 L68 217" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M320 228 L323 218 M325 229 L329 220" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M110 232 L112 222 M114 233 L118 224" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M220 235 L222 225 M224 236 L228 227" stroke="#558B2F" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Dog (Brown Dachshund) */}
                  {/* Tail */}
                  <path d="M125 165 Q110 140 100 148 Q92 155 110 170 Z" fill="#A04000" />
                  
                  {/* Back legs */}
                  <rect x="135" y="175" width="12" height="45" rx="6" fill="#8d3d19" />
                  <rect x="150" y="175" width="12" height="45" rx="6" fill="#A04000" />
                  
                  {/* Front legs */}
                  <rect x="250" y="175" width="12" height="45" rx="6" fill="#8d3d19" />
                  <rect x="265" y="175" width="12" height="45" rx="6" fill="#A04000" />

                  {/* Body */}
                  <path d="M130 180 L275 180 Q290 180 290 160 L130 160 Z" fill="#A04000" />

                  {/* Red Collar */}
                  <rect x="272" y="145" width="6" height="20" rx="2" transform="rotate(-15 272 145)" fill="#E53935" />
                  <circle cx="280" cy="162" r="4.5" fill="#FDD835" />

                  {/* Head & Snout */}
                  <circle cx="290" cy="140" r="18" fill="#A04000" />
                  <path d="M290 130 L325 142 Q335 145 325 152 L290 152 Z" fill="#A04000" />
                  <circle cx="325" cy="146" r="4" fill="#1C2833" />
                  <circle cx="288" cy="136" r="2.5" fill="#1C2833" />

                  {/* Floppy Ear */}
                  <path d="M276 138 C270 140 265 158 268 172 C270 176 278 176 277 167 C275 158 279 143 276 138 Z" fill="#8d3d19" />

                  {/* Cat (Sitting on Dog's back) */}
                  {/* Body */}
                  <path d="M175 168 C165 158 165 118 180 113 C195 108 205 128 200 168 Z" fill="#D1C4E9" />
                  
                  {/* Cat Tail */}
                  <path d="M195 160 Q215 145 205 115 Q198 100 208 105" fill="none" stroke="#D1C4E9" strokeWidth="6" strokeLinecap="round" />
                  
                  {/* Head */}
                  <circle cx="190" cy="95" r="16" fill="#D1C4E9" />
                  
                  {/* Ears */}
                  <path d="M177 89 L174 73 L185 81 Z" fill="#D1C4E9" />
                  <path d="M179 87 L176 77 L183 81 Z" fill="#F8BBD0" />
                  
                  <path d="M203 89 L206 73 L195 81 Z" fill="#D1C4E9" />
                  <path d="M201 87 L204 77 L197 81 Z" fill="#F8BBD0" />

                  {/* Face */}
                  <circle cx="185" cy="93" r="1.5" fill="#1C2833" />
                  <circle cx="195" cy="93" r="1.5" fill="#1C2833" />
                  <polygon points="190,96 188,98 192,98" fill="#F8BBD0" />
                  <path d="M180 97 L165 95 M180 99 L167 100 M200 97 L215 95 M200 99 L213 100" stroke="#7E57C2" strokeWidth="1" strokeLinecap="round" />
                  
                  {/* Cat Collar */}
                  <rect x="182" y="107" width="16" height="3" rx="1.5" fill="#E53935" />
                  <circle cx="190" cy="111" r="2.5" fill="#FDD835" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-4 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[20px] font-[800] tracking-tight text-black text-left mb-4 leading-tight">
                    Avez-vous des animaux de compagnie ?
                  </h1>

                  <div className="space-y-3 overflow-y-auto no-scrollbar pb-4" style={{ maxHeight: '55vh' }}>
                    {petsOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPets(option.id)}
                        className={`w-full text-left px-5 py-4 rounded-xl border flex items-center justify-between transition-all ${
                          pets === option.id
                            ? 'bg-[#EFE5FF]/40 border-transparent shadow-sm'
                            : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <span className={`text-[15px] font-bold ${pets === option.id ? 'text-black' : 'text-neutral-800'}`}>
                          {option.label}
                        </span>
                        <div className={`w-[22px] h-[22px] rounded-full border-[2.5px] flex items-center justify-center transition-colors ${
                          pets === option.id ? 'border-black' : 'border-neutral-400'
                        }`}>
                          {pets === option.id && (
                            <div className="w-[10px] h-[10px] bg-black rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep(15)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  <button
                    type="button"
                    onClick={handleSubmitStep19}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 20 ? (
            <motion.div 
              key="step20"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Back Arrow Button */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(19)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Star Sign Illustration */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Deep space cosmic background blob */}
                  <path d="M40 140 Q100 20 220 50 Q360 80 340 180 Q320 260 160 250 Q60 220 40 140 Z" fill="#1E1E2E" />
                  <path d="M60 140 Q110 50 210 70 Q310 90 310 170 Q280 230 170 220 Q80 200 60 140 Z" fill="#2D2B40" />

                  {/* Constellation Stars and Connection Lines */}
                  <line x1="120" y1="130" x2="160" y2="100" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                  <line x1="160" y1="100" x2="220" y2="110" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                  <line x1="220" y1="110" x2="240" y2="170" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                  <line x1="240" y1="170" x2="190" y2="200" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                  <line x1="190" y1="200" x2="120" y2="130" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />
                  <line x1="220" y1="110" x2="270" y2="90" stroke="#7E57C2" strokeWidth="2.5" strokeDasharray="3,3" />

                  {/* Star sparkles */}
                  <g transform="translate(120, 130)">
                    <path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" fill="#FFFFFF" />
                  </g>
                  <g transform="translate(220, 110)">
                    <path d="M0 -15 L4 -4 L15 0 L4 4 L0 15 L-4 4 L-15 0 L-4 -4 Z" fill="#E8D1FF" />
                  </g>
                  <g transform="translate(160, 100)">
                    <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#4DD0E1" />
                  </g>
                  <g transform="translate(240, 170)">
                    <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#FF1744" />
                  </g>
                  <g transform="translate(190, 200)">
                    <path d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z" fill="#B388FF" />
                  </g>
                  <circle cx="90" cy="80" r="2" fill="#FFFFFF" opacity="0.8" />
                  <circle cx="100" cy="180" r="3" fill="#E8D1FF" opacity="0.6" />
                  <circle cx="280" cy="140" r="2.5" fill="#4DD0E1" opacity="0.7" />
                  <circle cx="260" cy="70" r="1.5" fill="#FFFFFF" opacity="0.9" />
                  <circle cx="150" cy="220" r="2" fill="#FF8A80" opacity="0.5" />

                  {/* Hand sketching */}
                  <path d="M380 230 L310 180 L350 145 L400 180 Z" fill="#EDE7F6" />
                  <path d="M365 215 L325 185 L335 172 L375 202 Z" fill="#FF1744" stroke="#FF1744" strokeWidth="2" />
                  <path d="M325 180 C310 170 270 145 250 150 C235 154 225 170 235 185 C245 195 285 210 315 210 Z" fill="#8D5524" />
                  <path d="M245 160 C240 155 230 162 232 168 C234 174 245 180 252 176 Z" fill="#704118" />
                  <path d="M250 165 C245 160 238 167 240 173 C242 179 250 183 258 179 Z" fill="#8D5524" />
                  <path d="M258 172 C253 167 246 174 248 180 C250 186 258 189 265 184 Z" fill="#704118" />

                  {/* Cyan Pencil */}
                  <g transform="translate(230, 120) rotate(28)">
                    <rect x="0" y="0" width="12" height="70" rx="3" fill="#00ACC1" />
                    <rect x="3" y="0" width="6" height="70" fill="#00E5FF" />
                    <polygon points="0,0 6,-14 12,0" fill="#E5A93B" />
                    <polygon points="4,-9 6,-14 8,-9" fill="#263238" />
                  </g>
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[16px] font-black tracking-tight text-black text-left mb-2.5 leading-tight">
                    Quel est votre signe astrologique ?
                  </h1>

                  <div className="space-y-1.5 overflow-y-auto no-scrollbar pb-3" style={{ maxHeight: '55vh' }}>
                    {starSignOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setStarSign(option.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          starSign === option.id
                            ? 'bg-[#EFE5FF]/40 border-transparent shadow-xs'
                            : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <span className={`text-[12.5px] font-bold ${starSign === option.id ? 'text-black' : 'text-neutral-800'}`}>
                          {option.label}
                        </span>
                        <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                          starSign === option.id ? 'border-black' : 'border-neutral-400'
                        }`}>
                          {starSign === option.id && (
                            <div className="w-[8px] h-[8px] bg-black rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep(19)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  <button
                    type="button"
                    onClick={handleSubmitStep20}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 21 ? (
            <motion.div 
              key="step21"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden"
            >
              {/* Back Arrow Button */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(20)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Retour"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Religion Illustration */}
              <div className="pt-2 px-5 flex justify-center bg-white shrink-0 mt-4">
                <svg viewBox="0 0 400 280" className="w-full max-h-[160px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="200" cy="110" r="60" fill="#FFE0B2" opacity="0.4" />
                  <ellipse cx="200" cy="180" rx="45" ry="12" fill="#5C6BC0" />
                  <rect x="175" y="110" width="50" height="70" rx="6" fill="#EDE7F6" />
                  <ellipse cx="200" cy="110" rx="25" ry="8" fill="#D1C4E9" />
                  <rect x="197" y="98" width="6" height="15" fill="#37474F" />

                  {/* Flame */}
                  <path d="M200 95 C190 80 195 60 200 45 C205 60 210 80 200 95 Z" fill="#FF7043" />
                  <path d="M200 90 C194 78 197 65 200 52 C203 65 206 78 200 90 Z" fill="#FFCA28" />

                  {/* Left Hand */}
                  <path d="M70 250 L110 180 L140 160 L160 175 L120 260 Z" fill="#E64A19" />
                  <path d="M125 150 C125 130 110 90 120 70 C125 60 135 60 140 70 C148 85 145 110 150 130 Z" fill="#D7CCC8" />
                  <path d="M140 140 C145 120 142 85 152 75 C158 68 168 72 165 85 C162 105 160 125 162 145 Z" fill="#D7CCC8" />
                  <path d="M158 145 C162 125 165 90 175 85 C182 82 190 90 185 102 C180 118 175 135 170 155 Z" fill="#D7CCC8" />
                  <path d="M172 160 C178 145 185 120 195 122 C202 125 203 138 195 148 C188 158 180 170 175 180 Z" fill="#D7CCC8" />

                  {/* Right Hand */}
                  <path d="M330 250 L290 180 L260 160 L240 175 L280 260 Z" fill="#E64A19" />
                  <path d="M275 150 C275 130 290 90 280 70 C275 60 265 60 260 70 C252 85 255 110 250 130 Z" fill="#D7CCC8" />
                  <path d="M260 140 C255 120 258 85 248 75 C242 68 232 72 235 85 C238 105 240 125 238 145 Z" fill="#D7CCC8" />
                  <path d="M242 145 C238 125 235 90 225 85 C218 82 210 90 215 102 C220 118 225 135 230 155 Z" fill="#D7CCC8" />
                  <path d="M228 160 C222 145 215 120 205 122 C198 125 197 138 205 148 C212 158 220 170 225 180 Z" fill="#D7CCC8" />
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[16px] font-black tracking-tight text-black text-left mb-2.5 leading-tight">
                    Quelle est votre religion ?
                  </h1>

                  <div className="space-y-1.5 overflow-y-auto no-scrollbar pb-3" style={{ maxHeight: '55vh' }}>
                    {religionOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setReligion(option.id)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          religion === option.id
                            ? 'bg-[#EFE5FF]/40 border-transparent shadow-xs'
                            : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <span className={`text-[12.5px] font-bold ${religion === option.id ? 'text-black' : 'text-neutral-800'}`}>
                          {option.label}
                        </span>
                        <div className={`w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center transition-colors ${
                          religion === option.id ? 'border-black' : 'border-neutral-400'
                        }`}>
                          {religion === option.id && (
                            <div className="w-[8px] h-[8px] bg-black rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep(20)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  {/* Next Arrow Button to step 21.5 */}
                  <button
                    type="button"
                    onClick={handleSubmitStep21}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 21.5 ? (
            <motion.div 
              key="step21_5"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden bg-white text-black"
            >
              {/* Close Button X on top-left */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(21)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow-sm border border-gray-100 flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* World Landmarks Illustration */}
              <div className="pt-8 px-6 flex justify-center bg-white shrink-0">
                <svg viewBox="0 0 400 280" className="w-full max-h-[140px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Ocean / Globe base */}
                  <path d="M40 200 C80 140 180 120 360 160 C380 220 280 270 120 260 C60 250 30 230 40 200 Z" fill="#29B6F6" opacity="0.85" />
                  <path d="M80 180 C120 150 220 140 340 170 C310 220 200 250 100 230 Z" fill="#0288D1" opacity="0.6" />
                  
                  {/* Eiffel Tower (Left) */}
                  <g transform="translate(60, 20)">
                    <path d="M40 190 L60 80 L80 190 M52 130 L68 130 M46 160 L74 160 M55 190 Q60 165 65 190" stroke="#1A1A24" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M60 80 L60 20" stroke="#1A1A24" strokeWidth="3" strokeLinecap="round" />
                    <line x1="56" y1="100" x2="64" y2="100" stroke="#1A1A24" strokeWidth="2" />
                    <line x1="54" y1="115" x2="66" y2="115" stroke="#1A1A24" strokeWidth="2" />
                    <line x1="50" y1="145" x2="70" y2="145" stroke="#1A1A24" strokeWidth="2.5" />
                    <line x1="48" y1="175" x2="72" y2="175" stroke="#1A1A24" strokeWidth="2.5" />
                  </g>

                  {/* Leaning Tower of Pisa (Center) */}
                  <g transform="translate(150, 15) rotate(12 200 120)">
                    <rect x="30" y="20" width="60" height="150" rx="4" fill="#E57373" />
                    <path d="M30 20 Q60 0 90 20 Z" fill="#D32F2F" />
                    <rect x="25" y="35" width="70" height="12" rx="2" fill="#BA68C8" />
                    <rect x="25" y="60" width="70" height="12" rx="2" fill="#BA68C8" />
                    <rect x="25" y="85" width="70" height="12" rx="2" fill="#BA68C8" />
                    <rect x="25" y="110" width="70" height="12" rx="2" fill="#BA68C8" />
                    <rect x="25" y="135" width="70" height="12" rx="2" fill="#BA68C8" />
                    <circle cx="45" cy="41" r="3" fill="#FFFFFF" />
                    <circle cx="60" cy="41" r="3" fill="#FFFFFF" />
                    <circle cx="75" cy="41" r="3" fill="#FFFFFF" />
                    <circle cx="45" cy="66" r="3" fill="#FFFFFF" />
                    <circle cx="60" cy="66" r="3" fill="#FFFFFF" />
                    <circle cx="75" cy="66" r="3" fill="#FFFFFF" />
                    <circle cx="45" cy="91" r="3" fill="#FFFFFF" />
                    <circle cx="60" cy="91" r="3" fill="#FFFFFF" />
                    <circle cx="75" cy="91" r="3" fill="#FFFFFF" />
                  </g>

                  {/* Sydney Opera House Sails (Right) */}
                  <g transform="translate(230, 90)">
                    <path d="M10 100 Q40 20 80 80 Q50 90 10 100 Z" fill="#F5F5F5" stroke="#37474F" strokeWidth="2" />
                    <path d="M40 100 Q70 30 110 85 Q80 92 40 100 Z" fill="#FFFFFF" stroke="#37474F" strokeWidth="2" />
                    <path d="M70 100 Q100 45 135 90 Q110 95 70 100 Z" fill="#ECEFF1" stroke="#37474F" strokeWidth="2" />
                    <path d="M0 100 L140 100 L130 115 L10 115 Z" fill="#D7CCC8" />
                  </g>
                </svg>
              </div>

              {/* Quiz Body */}
              <div className="flex-1 flex flex-col px-5 pt-3 pb-2 overflow-hidden justify-between">
                <div className="flex-1 flex flex-col justify-start">
                  <h1 className="text-[20px] font-[800] tracking-tight text-black text-left mb-3 leading-tight">
                    Quelles langues parlez-vous ?
                  </h1>

                  <div className="space-y-2.5 overflow-y-auto no-scrollbar pb-4" style={{ maxHeight: '55vh' }}>
                    {languagesOptions.map((option) => {
                      const isSelected = languages.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            if (option.id === 'not_say') {
                              setLanguages(['not_say']);
                            } else if (languages.includes('not_say')) {
                              setLanguages([option.id]);
                            } else if (isSelected) {
                              const next = languages.filter(id => id !== option.id);
                              setLanguages(next.length > 0 ? next : ['fr']);
                            } else {
                              setLanguages([...languages.filter(id => id !== 'not_say'), option.id]);
                            }
                          }}
                          className={`w-full text-left px-5 py-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-[#EFE5FF]/50 border-transparent shadow-sm'
                              : 'bg-neutral-50/70 border-transparent hover:bg-neutral-100'
                          }`}
                        >
                          <span className={`text-[15px] font-bold ${isSelected ? 'text-black' : 'text-neutral-800'}`}>
                            {option.label}
                          </span>
                          <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-black text-white' : 'border-[2px] border-neutral-300'
                          }`}>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep(21)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  <button
                    type="button"
                    onClick={handleSubmitStep21_5}
                    className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-neutral-800 active:scale-[0.96] transition-all ml-auto"
                    aria-label="Étape suivante"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === 22 ? (
            <motion.div 
              key="step22"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col justify-between relative h-full overflow-hidden bg-white text-black"
            >
              {/* Close Button X on top-left */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(21.5)}
                  className="w-8 h-8 rounded-full bg-white/90 shadow-sm border border-gray-100 flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Photo Verification Illustration matching Image 1 */}
              <div className="pt-8 px-6 flex justify-center bg-white shrink-0">
                <svg viewBox="0 0 380 260" className="w-full max-h-[220px] mx-auto object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Yellow spotlight beam */}
                  <polygon points="120,40 310,210 50,210" fill="#FFE800" opacity="0.95" />
                  
                  {/* Red Desk Lamp */}
                  <path d="M310 70 L340 70 L340 210 M315 210 L365 210" stroke="#C62828" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M305 70 C295 50 325 30 345 45 L310 90 Z" fill="#C62828" />
                  <ellipse cx="327" cy="218" rx="22" ry="7" fill="#B71C1C" />

                  {/* Red background angle accent */}
                  <polygon points="190,40 280,40 280,180" fill="#D32F2F" />

                  {/* Green light section */}
                  <polygon points="80,50 160,30 190,130 90,120" fill="#81C784" />

                  {/* Character - Lavender/Purple sweater, dark wavy hair */}
                  <path d="M125 120 C120 70 210 60 220 110 C225 140 210 150 195 150 C180 150 170 140 160 140 C140 140 130 140 125 120 Z" fill="#1A1A1A" />
                  <path d="M135 110 C140 85 200 80 210 105 C215 125 200 135 185 130 Z" fill="#262626" />

                  {/* Face */}
                  <path d="M150 115 C150 100 195 100 195 120 C195 140 185 155 170 155 C158 155 150 140 150 115 Z" fill="#FFD1B3" />
                  
                  {/* Facial Features */}
                  <circle cx="163" cy="122" r="2" fill="#1A1A1A" />
                  <circle cx="185" cy="122" r="2" fill="#1A1A1A" />
                  <path d="M160 116 Q165 113 170 116" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M180 116 Q185 113 190 116" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M172 122 L170 130 L174 130" stroke="#E59866" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M168 138 Q173 143 178 138" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" fill="none" />

                  {/* Sweater / Torso */}
                  <path d="M110 230 C120 170 140 160 170 160 C200 160 220 170 235 230 Z" fill="#E1BEE7" />
                  <path d="M140 170 C150 165 190 165 200 170 L200 230 L140 230 Z" fill="#D1C4E9" />
                  <path d="M150 180 L150 230 M165 175 L165 230 M180 175 L180 230 M195 180 L195 230" stroke="#B39DDB" strokeWidth="1.5" />

                  {/* Arms & Hands raised up */}
                  <path d="M110 230 Q100 160 140 100 Q150 110 130 160 Z" fill="#FFE0B2" />
                  <path d="M135 105 Q125 90 140 75 Q145 85 140 100 Z" fill="#FFD1B3" />
                  <circle cx="130" cy="80" r="3" fill="#66BB6A" />
                  <circle cx="138" cy="74" r="3" fill="#66BB6A" />

                  <path d="M235 230 Q250 160 210 100 Q200 110 220 160 Z" fill="#FFE0B2" />
                  <path d="M205 105 Q215 90 200 75 Q195 85 200 100 Z" fill="#FFD1B3" />
                  <circle cx="210" cy="80" r="3" fill="#66BB6A" />
                  <circle cx="202" cy="74" r="3" fill="#66BB6A" />
                </svg>
              </div>

              {/* Photo verification is available after account creation. */}
              <div className="flex-1 flex flex-col justify-between px-6 pt-4 pb-2">
                <div>
                  <h1 className="text-[22px] sm:text-[24px] font-[850] text-black text-left mb-2.5 tracking-tight leading-snug">
                    Vérifiez votre profil par selfie
                  </h1>
                  <p className="text-[14.5px] font-medium text-gray-500 text-left mb-6 leading-relaxed">
                    Après avoir créé votre compte, vous pourrez lancer une vérification photo depuis votre profil. Elle utilise un défi selfie et compare votre visage aux photos de votre profil; ce n’est pas une vérification d’identité.
                  </p>

                  <div className="space-y-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setShowCongratsModal(true)}
                      className="w-full bg-black text-white font-[800] text-[16px] py-3.5 px-6 rounded-full flex items-center justify-center space-x-2.5 cursor-pointer"
                    >
                      <span>Continuer et vérifier plus tard</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Navigation Row */}
                <div className="pt-2 pb-1.5 mt-auto flex items-center justify-between border-t border-gray-100 bg-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setStep(3.2)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-black hover:bg-gray-50 active:scale-[0.96] transition-all mr-4"
                    aria-label="Étape précédente"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <QuizProgressIndicator step={step} />

                  <div className="w-10 h-10 ml-auto" />
                </div>
              </div>
            </motion.div>
          ) : step === 23 ? (
            <motion.div 
              key="step23"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col relative h-full overflow-y-auto no-scrollbar bg-white text-black p-6 pb-8"
            >
              {/* Close Button X on top-left */}
              <div className="absolute top-3 left-4 z-10">
                <button
                  type="button"
                  onClick={() => setStep(22)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Pose Card Photo matching Image 2 */}
              <div className="pt-6 pb-2 flex justify-center">
                <div className="w-[170px] h-[210px] rounded-[24px] overflow-hidden shadow-lg border-2 border-purple-100 bg-[#5E35B1] relative flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" 
                    alt="Pose modèle" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-4 border-dashed border-white/30 rounded-[22px] pointer-events-none" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="text-center space-y-2 mb-4">
                <h2 className="text-[21px] sm:text-[22px] font-[850] text-black tracking-tight leading-tight">
                  Reproduisez cette pose et prenez une photo
                </h2>
                <p className="text-[14px] font-medium text-gray-500 max-w-[320px] mx-auto leading-relaxed">
                  Nous vérifierons que cette photo correspond à la personne de votre profil. Elle ne sera pas visible sur votre profil.
                </p>
              </div>

              {/* Verification requirements */}
              <div className="text-center mb-4">
                <p className="text-[14.5px] font-[850] text-black mb-1.5">
                  Pour réussir la vérification :
                </p>
                <ul className="text-[14px] font-bold text-black space-y-1 inline-block text-left">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                    <span>Votre visage doit être clairement visible</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                    <span>Vous devez reproduire exactement cette pose</span>
                  </li>
                </ul>
              </div>

              <p className="text-[12.5px] font-normal text-gray-400 text-center max-w-[320px] mx-auto mb-6 leading-snug">
                Pour en savoir plus sur la façon dont nous utilisons, conservons et protégeons vos données personnelles, veuillez consulter notre Politique de confidentialité.
              </p>

              {/* Main Take Photo Button */}
              <button
                type="button"
                onClick={triggerNativeCamera}
                className="w-full bg-black text-white font-[800] text-[16px] py-4 rounded-full shadow-md hover:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer mb-6 flex items-center justify-center space-x-2"
              >
                <Camera className="w-5 h-5 stroke-[2.2]" />
                <span>Prendre une photo</span>
              </button>

              {/* Bottom List links matching Image 2 */}
              <div className="space-y-3.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setInfoModalContent({
                    title: 'Politique de confidentialité',
                    text: 'Vos données de vérification photo sont strictement utilisées pour la sécurité de la communauté. Elles sont stockées en toute sécurité et ne seront jamais publiées.'
                  })}
                  className="w-full flex items-center justify-between text-left font-[750] text-[14.5px] text-black hover:opacity-80 transition-all cursor-pointer"
                >
                  <span>Consulter la politique de confidentialité</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => setInfoModalContent({
                    title: 'Pourquoi est-ce nécessaire ?',
                    text: 'La vérification photo garantit que chaque compte appartient à une personne réelle correspondant à ses photos, maintenant ainsi une communauté authentique et sécurisée.'
                  })}
                  className="w-full flex items-center justify-between text-left font-[750] text-[14.5px] text-black hover:opacity-80 transition-all cursor-pointer"
                >
                  <span>Pourquoi est-ce nécessaire ?</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 stroke-[2.5]" />
                </button>

                <button
                  type="button"
                  onClick={() => setInfoModalContent({
                    title: 'Retirer le consentement',
                    text: 'Vous pouvez demander la suppression ou le retrait de vos données de vérification à tout moment via le support.'
                  })}
                  className="w-full flex items-center justify-between text-left font-[750] text-[14.5px] text-black hover:opacity-80 transition-all cursor-pointer"
                >
                  <span>Contacter le support pour retirer votre consentement</span>
                  <Info className="w-4.5 h-4.5 text-gray-400 stroke-[2]" />
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* More Choices Modal/Sheet */}
        <AnimatePresence>
          {showMoreChoices && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-[100] flex items-end justify-center px-4"
              onClick={() => setShowMoreChoices(false)}
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="w-full max-w-[420px] bg-white rounded-t-[32px] p-5 pb-6 text-black relative flex flex-col max-h-[90%] overflow-y-auto scrollbar-hide"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button X on top right */}
                <button
                  type="button"
                  onClick={() => setShowMoreChoices(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Header Content */}
                <div className="text-center mt-3 mb-4 px-4">
                  <h3 className="text-[17px] sm:text-[19px] font-[900] tracking-tight text-gray-900 leading-tight">
                    Plus d'options de genre
                  </h3>
                  <p className="text-[11px] sm:text-[12px] text-gray-500 font-[500] leading-relaxed mt-1">
                    Choisissez l'identité de genre qui vous correspond le mieux. Vous pourrez la modifier à tout moment.
                  </p>
                </div>

                {/* Beautiful options cards */}
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5 scrollbar-hide">
                  {[
                    {
                      id: 'Non-binaire',
                      title: 'Non-binaire',
                      subtitle: "Identité ne s'inscrivant pas dans la binarité homme/femme.",
                      emoji: '✨'
                    },
                    {
                      id: 'Genderqueer',
                      title: 'Genderqueer',
                      subtitle: "Identité de genre fluide, multiple ou hors des normes.",
                      emoji: '🔮'
                    },
                    {
                      id: 'Agenre',
                      title: 'Agenre',
                      subtitle: "Ne s'identifie à aucun genre ou se sent neutre.",
                      emoji: '🪐'
                    },
                    {
                      id: 'Transgenre',
                      title: 'Transgenre',
                      subtitle: "Genre différent du sexe assigné à la naissance.",
                      emoji: '🏳️‍⚧️'
                    },
                    {
                      id: 'Autre',
                      title: 'Autre genre',
                      subtitle: "Une autre définition ou expression de votre identité.",
                      emoji: '🌈'
                    }
                  ].map((opt) => {
                    const isSelected = tempSelectedGender === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setTempSelectedGender(opt.id)}
                        className={`w-full p-2.5 sm:p-3 rounded-[14px] border-2 flex items-center text-left transition-all duration-300 relative ${
                          isSelected 
                            ? 'bg-[#F0E6FF] border-[#B68DFF] shadow-xs' 
                            : 'bg-gray-50 hover:bg-gray-100/70 border-transparent text-gray-700'
                        }`}
                      >
                        {/* Emoji visual badge */}
                        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-[16px] transition-all duration-300 ${
                          isSelected ? 'bg-white/80 shadow-xs' : 'bg-white border border-gray-100'
                        }`}>
                          {opt.emoji}
                        </div>

                        {/* Title and subtitle text */}
                        <div className="flex-1 ml-3 pr-2">
                          <h4 className={`text-[12.5px] sm:text-[13px] ${isSelected ? 'font-black text-purple-950' : 'font-extrabold text-gray-800'}`}>
                            {opt.title}
                          </h4>
                          <p className={`text-[10px] sm:text-[10.5px] mt-0.5 leading-snug font-[500] ${
                            isSelected ? 'text-purple-700/90' : 'text-gray-400'
                          }`}>
                            {opt.subtitle}
                          </p>
                        </div>

                        {/* Radio select dot */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isSelected 
                            ? 'border-gray-900 bg-gray-900' 
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && (
                            <div className="w-[5px] h-[5px] rounded-full bg-white" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Save button */}
                <div className="pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setGender('more');
                      setCustomGender(tempSelectedGender);
                      setErrors(prev => ({ ...prev, gender: undefined }));
                      setShowMoreChoices(false);
                    }}
                    className="w-full h-[44px] bg-black text-white hover:bg-neutral-900 rounded-full font-[800] text-[13.5px] flex items-center justify-center transition-all shadow-md shadow-neutral-200 active:scale-[0.98] mt-3"
                  >
                    Confirmer le choix
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Photos Bottom Sheet Drawer */}
        <AnimatePresence>
          {showPhotoModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPhotoModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-end justify-center"
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white rounded-t-[28px] p-6 text-black flex flex-col relative shadow-2xl pb-8"
              >
                {/* Close button X top right */}
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-gray-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                </button>

                <h2 className="text-[20px] sm:text-[21px] font-[800] tracking-tight text-black leading-tight pr-8 mb-1.5">
                  Ajouter d'autres photos
                </h2>
                <p className="text-[13.5px] sm:text-[14px] font-[400] text-gray-500 leading-snug mb-5">
                  Rien de plus simple : une photo nette et un beau sourire suffisent à créer le déclic.
                </p>

                {/* Option 1: Your Photos */}
                <button
                  type="button"
                  onClick={() => {
                    if (galleryInputRef.current) {
                      galleryInputRef.current.click();
                    }
                  }}
                  className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-2xl transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-full bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[15px] font-[700] text-black">Vos photos (Galerie)</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <div className="h-[1px] bg-gray-100 my-1" />

                {/* Option 2: Take A Photo */}
                <button
                  type="button"
                  onClick={() => {
                    if (cameraInputRef.current) {
                      cameraInputRef.current.click();
                    }
                  }}
                  className="w-full flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded-2xl transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-full bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-[15px] font-[700] text-black">Prendre une photo</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Hidden File Inputs */}
                <input 
                  type="file" 
                  ref={galleryInputRef} 
                  accept="image/*" 
                  onChange={handlePhotoFileChange} 
                  className="hidden" 
                />
                <input 
                  type="file" 
                  ref={cameraInputRef} 
                  accept="image/*" 
                  capture="user" 
                  onChange={handlePhotoFileChange} 
                  className="hidden" 
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Congratulations Modal */}
        <AnimatePresence>
          {showCongratsModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-[120] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.85, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 15 }}
                transition={{ type: "spring", damping: 22, stiffness: 280 }}
                className="w-full max-w-[320px] bg-white rounded-[32px] p-6 text-center text-black shadow-2xl flex flex-col items-center relative overflow-hidden"
              >
                {/* Decorative background glow */}
                <div className="absolute -top-12 -left-12 w-28 h-28 bg-purple-200/50 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-rose-200/50 rounded-full blur-2xl pointer-events-none" />

                {/* Celebrating Icon badge */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 p-1 shadow-lg shadow-purple-500/30 mb-4 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Sparkles className="w-9 h-9 text-purple-600 animate-pulse" />
                  </div>
                </div>

                <h2 className="text-[22px] font-[800] tracking-tight text-black mb-1.5">
                  Félicitations !
                </h2>
                <p className="text-[13.5px] font-[500] text-gray-600 leading-relaxed mb-5">
                  Félicitations d'avoir rejoint la communauté ! Nous vous souhaitons bonne chance et de magnifiques rencontres.
                </p>

                {userLocation && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-[12.5px] font-semibold text-gray-800 mb-5 border border-gray-200">
                    <span>📍 {userLocation.split(',')[0]}</span>
                  </div>
                )}

                {submissionError && (
                  <p className="mb-4 text-sm font-semibold text-red-600" role="alert">
                    {submissionError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleSubmitFinal}
                  disabled={isSubmitting}
                  className="w-full h-[50px] sm:h-[52px] rounded-full bg-black text-white font-[700] text-[15.5px] hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-md flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enregistrement...' : "Accéder à l'application"}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prompt Answering Modal Sheet matching exact screenshots */}
        <AnimatePresence>
          {activePrompt && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs z-[130] flex items-end justify-center"
              onClick={() => setActivePrompt(null)}
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-white rounded-t-[32px] p-6 text-black flex flex-col relative shadow-2xl max-h-[88vh] overflow-hidden"
              >
                {/* Close X Button */}
                <button
                  type="button"
                  onClick={() => setActivePrompt(null)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-gray-100 transition-colors cursor-pointer z-10"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Question Title */}
                <h2 className="text-[17px] font-[850] tracking-tight text-black leading-snug mb-3 pr-8 pt-1 shrink-0">
                  {activePrompt}
                </h2>

                {/* Radio Options List */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 mb-3 pr-1">
                  {(PROMPT_OPTIONS_MAP[activePrompt] || [
                    "Option 1",
                    "Option 2",
                    "Option 3",
                    "Option 4"
                  ]).concat(["Votre propre réponse"]).map((option, optIdx) => {
                    const isSelected = selectedPromptOption === option;
                    return (
                      <div key={`${option}-${optIdx}`} className="flex flex-col space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPromptOption(option)}
                          className={`w-full text-left px-4 py-3 rounded-[18px] bg-[#F4F4F6] hover:bg-[#EAEAEF] transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] border-2 ${
                            isSelected ? 'border-black' : 'border-transparent'
                          }`}
                        >
                          <span className="text-[13.5px] font-[700] text-black pr-3 leading-snug">
                            {option}
                          </span>
                          <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-black bg-black' : 'border-black/80 bg-transparent'
                          }`}>
                            {isSelected && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </button>

                        {/* Input field if "Votre propre réponse" is selected */}
                        {option === "Votre propre réponse" && isSelected && (
                          <div className="pt-1 pb-1.5">
                            <textarea
                              value={customPromptAnswer}
                              onChange={(e) => setCustomPromptAnswer(e.target.value.slice(0, 150))}
                              placeholder="Écrivez votre propre réponse ici..."
                              rows={3}
                              className="w-full p-3 rounded-xl bg-[#F4F4F6] border border-gray-300 text-[13px] font-semibold text-black focus:outline-none focus:border-black focus:bg-white transition-all resize-none"
                            />
                            <div className="text-right text-[10px] font-bold text-gray-400 mt-0.5">
                              {customPromptAnswer.length}/150
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Buttons: Terminé & Annuler */}
                <div className="shrink-0 pt-2 border-t border-gray-100 flex flex-col space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const finalAnswer = selectedPromptOption === "Votre propre réponse" 
                        ? customPromptAnswer.trim() 
                        : selectedPromptOption;
                      
                      if (!finalAnswer) return;

                      if (prompt1Question === activePrompt) {
                        setPrompt1Answer(finalAnswer);
                      } else if (prompt2Question === activePrompt) {
                        setPrompt2Answer(finalAnswer);
                      } else if (prompt3Question === activePrompt) {
                        setPrompt3Answer(finalAnswer);
                      } else if (!prompt1Question) {
                        setPrompt1Question(activePrompt);
                        setPrompt1Answer(finalAnswer);
                      } else if (!prompt2Question) {
                        setPrompt2Question(activePrompt);
                        setPrompt2Answer(finalAnswer);
                      } else if (!prompt3Question) {
                        setPrompt3Question(activePrompt);
                        setPrompt3Answer(finalAnswer);
                      } else {
                        setPrompt1Question(activePrompt);
                        setPrompt1Answer(finalAnswer);
                      }
                      setActivePrompt(null);
                    }}
                    disabled={
                      !selectedPromptOption || 
                      (selectedPromptOption === "Votre propre réponse" && !customPromptAnswer.trim())
                    }
                    className={`w-full h-[46px] rounded-full font-[800] text-[14.5px] flex items-center justify-center transition-all ${
                      selectedPromptOption && (selectedPromptOption !== "Votre propre réponse" || customPromptAnswer.trim())
                        ? 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98] cursor-pointer shadow-sm'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Terminé
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePrompt(null)}
                    className="w-full text-center font-[750] text-black text-[13.5px] py-1.5 cursor-pointer hover:underline transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Photo Camera Live Viewport Modal */}
        <AnimatePresence>
          {(showLiveCamera || isTakingPhoto || photoVerified || verificationFailed) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black z-[120] flex flex-col justify-between text-white overflow-hidden"
            >
              {/* Hidden File Input for fallback upload */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                capture="user" 
                onChange={handleFileUpload} 
                className="hidden" 
              />

              {/* Reference Pose Avatar PIP Badge Top-Left matching User Screenshot */}
              <div className="absolute top-4 left-4 z-[140] w-[92px] h-[126px] sm:w-[102px] sm:h-[138px] rounded-[18px] overflow-hidden border-2 border-white/90 shadow-2xl bg-[#5E35B1] flex items-center justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" 
                  alt="Modèle pose référence" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border border-white/20 rounded-[16px] pointer-events-none" />
              </div>

              {/* Top Right Close Button */}
              <div className="absolute top-4 right-4 z-[140]">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setShowLiveCamera(false);
                    setIsTakingPhoto(false);
                    setPhotoVerified(false);
                    setVerificationFailed(false);
                  }}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center text-white cursor-pointer transition-all border border-white/20"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Full Viewport Camera Stream */}
              <div className="absolute inset-0 w-full h-full bg-neutral-950 flex items-center justify-center">
                {capturedPhotoUrl ? (
                  <img 
                    src={capturedPhotoUrl} 
                    alt="Selfie capturé" 
                    className="w-full h-full object-cover"
                  />
                ) : cameraStream ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover -scale-x-100" 
                  />
                ) : cameraError ? (
                  <div className="p-6 text-center space-y-4 max-w-[320px] bg-neutral-900/90 rounded-[28px] border border-white/10 shadow-2xl">
                    <Camera className="w-12 h-12 text-purple-400 mx-auto opacity-80" />
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-black text-xs font-bold py-2.5 px-5 rounded-full shadow hover:bg-gray-100 cursor-pointer transition-all inline-block"
                    >
                      Importer une photo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-300 font-medium">Ouverture de la caméra...</p>
                  </div>
                )}

                {/* Pose Overlay Helper Badge */}
                {cameraStream && !capturedPhotoUrl && !isTakingPhoto && !photoVerified && !verificationFailed && (
                  <div className="absolute top-20 right-4 z-[130] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-[11.5px] font-bold text-white flex items-center space-x-1.5 shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                    <span>Imitez la pose du coin supérieur gauche</span>
                  </div>
                )}

                {/* Processing Overlay */}
                {isTakingPhoto && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-4 p-6 text-center z-[135]">
                    <div className="w-14 h-14 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <div className="space-y-1">
                      <p className="text-[16px] font-black text-white">Vérification de la pose...</p>
                      <p className="text-xs text-purple-200">Comparaison avec l'image modèle</p>
                    </div>
                  </div>
                )}

                {/* Verification Failed Overlay with Retry Option */}
                {verificationFailed && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-[135] space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40">
                      <X className="w-9 h-9 stroke-[3]" />
                    </div>
                    <div className="space-y-2 max-w-[290px]">
                      <p className="text-[18px] font-black text-white leading-tight">
                        Pose non valide ou incomplète
                      </p>
                      <p className="text-[13px] text-gray-300 font-medium leading-relaxed">
                        {verificationErrorMsg || "Assurez-vous d'imiter exactement le geste de la personne dans le coin supérieur gauche et que votre visage est bien éclairé."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={retakePhoto}
                      className="bg-white text-black font-extrabold text-[14.5px] py-3.5 px-8 rounded-full shadow-lg hover:bg-gray-100 active:scale-95 transition-all cursor-pointer mt-2"
                    >
                      Reprendre la photo
                    </button>
                  </motion.div>
                )}

                {/* Verified Success Overlay */}
                {photoVerified && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-emerald-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-3 p-6 text-center z-[135]"
                  >
                    <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-xl">
                      <Check className="w-9 h-9 stroke-[3]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[20px] font-black">Photo vérifiée !</p>
                      <p className="text-[13px] opacity-90 font-semibold">Pose conforme • Validation du profil réussie</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Bottom Control Bar matching User Screenshot */}
              <div className="absolute bottom-0 left-0 right-0 h-[96px] bg-black/90 backdrop-blur-md flex items-center justify-between px-8 z-[140] border-t border-white/10">
                {/* Left Cancel Button */}
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setShowLiveCamera(false);
                    setCapturedPhotoUrl(null);
                    setIsTakingPhoto(false);
                    setPhotoVerified(false);
                    setVerificationFailed(false);
                  }}
                  className="text-white font-semibold text-[16px] hover:opacity-80 transition-all cursor-pointer py-2 px-1"
                >
                  Cancel
                </button>

                {/* Center Shutter Button */}
                {!capturedPhotoUrl && !isTakingPhoto && !photoVerified && !verificationFailed && (
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    disabled={!cameraStream && !capturedPhotoUrl}
                    className="w-[68px] h-[68px] rounded-full border-[3.5px] border-white p-[3px] flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-2xl disabled:opacity-50"
                    aria-label="Prendre la photo"
                  >
                    <div className="w-full h-full rounded-full bg-white shadow-inner" />
                  </button>
                )}

                {/* Right Upload / Retry Button */}
                {!capturedPhotoUrl && !isTakingPhoto && !photoVerified && !verificationFailed ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
                    aria-label="Importer une photo"
                  >
                    <ImageIcon className="w-5 h-5 stroke-[2]" />
                  </button>
                ) : (
                  <div className="w-10" />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Content Sheet Drawer */}
        <AnimatePresence>
          {infoModalContent && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-[110] flex items-end justify-center"
              onClick={() => setInfoModalContent(null)}
            >
              <motion.div 
                initial={{ y: 200 }}
                animate={{ y: 0 }}
                exit={{ y: 200 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full bg-white rounded-t-[32px] p-6 text-black space-y-4 max-h-[80%]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-[17px] font-extrabold">{infoModalContent.title}</h3>
                  <button 
                    type="button"
                    onClick={() => setInfoModalContent(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-black hover:bg-gray-200 cursor-pointer"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                <p className="text-[14.5px] font-medium text-gray-700 leading-relaxed pt-1 pb-4">
                  {infoModalContent.text}
                </p>

                <button
                  type="button"
                  onClick={() => setInfoModalContent(null)}
                  className="w-full h-[50px] rounded-full bg-black text-white font-bold text-[15px] cursor-pointer"
                >
                  Fermer
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
