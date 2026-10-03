import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const VALID_TABS = ['discover', 'encounters', 'likes', 'discussions', 'profile'];

const getTabFromUrl = (): string => {
  try {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash === 'a-decouvrir' || hash === 'decouvrir' || hash === 'discover') return 'discover';
    if (hash === 'rencontre' || hash === 'rencontres' || hash === 'encounters') return 'encounters';
    if (hash === 'likes' || hash === 'like') return 'likes';
    if (hash === 'discussions' || hash === 'discussion' || hash === 'messages') return 'discussions';
    if (hash === 'profils' || hash === 'profil' || hash === 'profile') return 'profile';

    const path = window.location.pathname.replace('/', '').toLowerCase();
    if (path === 'a-decouvrir' || path === 'decouvrir' || path === 'discover') return 'discover';
    if (path === 'rencontre' || path === 'rencontres' || path === 'encounters') return 'encounters';
    if (path === 'likes') return 'likes';
    if (path === 'discussions') return 'discussions';
    if (path === 'profils' || path === 'profil' || path === 'profile') return 'profile';

    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get('tab');
    if (queryTab && VALID_TABS.includes(queryTab)) return queryTab;
  } catch (e) {
    // Fallback
  }
  return 'encounters';
};

export const useMobileAppState = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTabState] = useState<string>(() => getTabFromUrl());

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    try {
      if (window.location.hash !== `#${tab}`) {
        window.history.pushState({ tab }, '', `#${tab}`);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromUrl();
      setActiveTabState(tab);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Smooth splash transition that guarantees screen hides once auth is checked
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      setShowSplash(false);
      if (!isAuthenticated && !user) {
        setShowLogin(true);
      } else {
        setShowLogin(false);
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated && !user) {
        setShowLogin(true);
      } else {
        setShowLogin(false);
      }
    }
  }, [authLoading, isAuthenticated, user]);

  return {
    authLoading,
    showSplash,
    setShowSplash,
    showLogin,
    setShowLogin,
    activeTab,
    setActiveTab,
  };
};


