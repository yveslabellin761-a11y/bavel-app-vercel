import React, { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useUX } from '../../context/UXContext';

interface GiphyGif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

interface GiphyPickerProps {
  onSelectGif: (gifUrl: string, title: string) => void;
  onClose: () => void;
}

const POPULAR_GIF_CATEGORIES = ['Tendances', 'Amour ❤️', 'Bisous 💋', 'Drôle 😂', 'Danse 💃', 'Clin d’œil 😉'];

export const GiphyPicker: React.FC<GiphyPickerProps> = ({ onSelectGif, onClose }) => {
  const { triggerFeedback } = useUX();
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGifs = useCallback(async (query: string, signal: AbortSignal) => {
    const apiKey = import.meta.env.VITE_GIPHY_API_KEY?.trim();
    if (!apiKey) {
      setGifs([]);
      setError('La recherche de GIF sera disponible après configuration de GIPHY.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const endpoint = new URL(query.trim()
        ? 'https://api.giphy.com/v1/gifs/search'
        : 'https://api.giphy.com/v1/gifs/trending');
      endpoint.searchParams.set('api_key', apiKey);
      endpoint.searchParams.set('limit', '18');
      endpoint.searchParams.set('rating', 'g');
      if (query.trim()) endpoint.searchParams.set('q', query.trim());

      const response = await fetch(endpoint, { signal });
      if (!response.ok) throw new Error(`GIPHY returned ${response.status}.`);
      const json = await response.json();
      const results: GiphyGif[] = Array.isArray(json.data)
        ? json.data.flatMap((item: any) => {
          const url = item.images?.fixed_height?.url || item.images?.original?.url;
          if (typeof url !== 'string') return [];
          return [{
            id: String(item.id),
            title: typeof item.title === 'string' ? item.title : 'GIF Giphy',
            url,
            previewUrl: item.images?.fixed_height_small?.url || url,
          }];
        })
        : [];
      setGifs(results);
      if (!results.length) setError(query.trim() ? 'Aucun GIF trouvé.' : 'Aucun GIF tendance disponible pour le moment.');
    } catch (cause) {
      if (signal.aborted) return;
      console.error('Giphy API request failed:', cause);
      setGifs([]);
      setError('Impossible de charger les GIF pour le moment. Réessaie plus tard.');
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchGifs(searchTerm, controller.signal);
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, fetchGifs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="p-3 bg-neutral-900 border-t border-neutral-800 text-white flex flex-col gap-2.5 max-h-[280px] overflow-hidden rounded-t-2xl shadow-2xl"
    >
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher des GIFs animés sur Giphy..."
            className="w-full bg-neutral-800 text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-neutral-400"
          />
        </div>
        <button
          onClick={() => {
            triggerFeedback('light');
            onClose();
          }}
          className="p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
          aria-label="Fermer la recherche de GIF"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
        {POPULAR_GIF_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => {
              triggerFeedback('light');
              const clean = category.replace(/[^\w\s]/gi, '').trim();
              setSearchTerm(clean === 'Tendances' ? '' : clean);
            }}
            className="px-2.5 py-1 rounded-full bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-300 text-[10px] font-bold text-neutral-300 shrink-0 border border-neutral-700/50 transition-colors"
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[180px] pr-1 no-scrollbar">
        {isLoading ? (
          <div className="col-span-3 py-8 flex items-center justify-center text-neutral-400 text-xs">
            Chargement des GIF...
          </div>
        ) : error ? (
          <div className="col-span-3 py-6 text-center text-neutral-400 text-xs">{error}</div>
        ) : gifs.map((gif) => (
          <button
            key={gif.id}
            onClick={() => {
              triggerFeedback('medium');
              onSelectGif(gif.url, gif.title);
            }}
            aria-label={`Envoyer le GIF ${gif.title}`}
            className="relative aspect-video rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 cursor-pointer hover:scale-[1.03] transition-transform active:scale-95"
          >
            <img
              src={gif.previewUrl}
              alt={gif.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
};
