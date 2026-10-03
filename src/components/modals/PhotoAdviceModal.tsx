import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Star } from 'lucide-react';

interface PhotoAdviceModalProps {
  onClose: () => void;
  onAddPhoto?: () => void;
}

export function PhotoAdviceModal({ onClose, onAddPhoto }: PhotoAdviceModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Montre-nous ton plus beau sourire !",
      subtitle: "Les gens veulent savoir à quoi vous ressemblez : ajoutez des photos où on vous voit bien !",
      images: [
        { url: "/src/assets/images/man_smiling_brick_1784885135242.jpg", valid: true },
        { url: "/src/assets/images/man_covering_face_1784885151434.jpg", valid: false }
      ]
    },
    {
      title: "Ajoutez des photos de vous",
      subtitle: "Montre ton vrai visage : n'utilise pas de photos de stars !",
      images: [
        { url: "/src/assets/images/jt_stage_photo_1784885087126.jpg", valid: false }
      ]
    },
    {
      title: "Ajoutez des photos décentes",
      subtitle: "Pas de nudité ou de photos indécentes !",
      images: [
        { url: "/src/assets/images/surfer_man_1784885103664.jpg", valid: true },
        { url: "/src/assets/images/shirtless_man_1784885117678.jpg", valid: false }
      ]
    }
  ];

  const slide = slides[currentSlide];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col pt-4 pb-8 px-6 shadow-2xl relative">
        {/* Close Button */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={onClose}
            className="p-2 text-black hover:opacity-70 transition-opacity"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Image comparison pair */}
        <div className="flex items-center justify-center space-x-3 mb-8 mt-10">
          {slide.images.map((img, idx) => {
            let iconPosition = "bottom-0 translate-y-1/2 right-4";
            if (slide.images.length === 1) {
              iconPosition = "bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2";
            } else if (idx === 0) {
              iconPosition = "bottom-0 translate-y-1/2 right-4"; // Left image, bottom right
            } else {
              iconPosition = "bottom-0 translate-y-1/2 left-4"; // Right image, bottom left
            }

            return (
              <div key={idx} className="relative w-[130px] h-[170px] sm:w-[145px] sm:h-[190px]">
                <div className="w-full h-full rounded-[20px] overflow-hidden relative">
                  <img 
                    src={img.url} 
                    alt={`Example ${idx}`} 
                    className="w-full h-full object-cover" 
                  />
                  {slide.title === "Ajoutez des photos décentes" && !img.valid && (
                    <div className="absolute bottom-0 left-0 right-0 h-[45%] backdrop-blur-xl bg-yellow-400/30 overflow-hidden">
                      <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-40">
                        {Array.from({length: 24}).map((_, i) => (
                          <div key={i} className={i % 2 === 0 ? 'bg-black/30' : i % 3 === 0 ? 'bg-yellow-600/30' : 'bg-transparent'} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className={`absolute ${iconPosition} w-8 h-8 rounded-full flex items-center justify-center text-white border-[3px] border-white shadow-sm ${
                  img.valid ? 'bg-[#5ea108]' : 'bg-[#c30114]'
                } z-10`}>
                  {img.valid ? <Check className="w-5 h-5 stroke-[3]" /> : <X className="w-5 h-5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Title & Subtitle */}
        <div className="text-center px-4 mb-6">
          <h2 className="text-[20px] font-black text-black tracking-tight mb-2">
            {slide.title}
          </h2>
          <p className="text-[14px] text-gray-500 font-medium leading-relaxed">
            {slide.subtitle}
          </p>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center space-x-2.5 mb-6">
          {slides.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-[7px] h-[7px] rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'bg-gray-600' : 'bg-transparent border border-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <button 
          onClick={() => {
            onClose();
            if (onAddPhoto) onAddPhoto();
          }}
          className="w-full bg-[#111111] text-white font-bold text-[15px] py-4 rounded-full shadow-lg hover:bg-black active:scale-[0.99] transition-all"
        >
          Ajouter une photo
        </button>
      </div>
    </motion.div>
  );
}
