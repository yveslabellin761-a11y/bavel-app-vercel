import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Lock, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../../utils/audio';
import { authFetch } from '../../lib/authFetch';
import { detectUserGeoAndLanguage } from '../../lib/autoLanguage';

export interface PaymentItem {
  type: 'credits' | 'subscription';
  productId: string;
  title: string;
  amount: string; // e.g. "59,99 €" or "3 500 FCFA"
  creditsToAdd?: number;
  creditsAmount?: number;
  subscriptionPlan?: 'extra' | 'premium';
  description?: string;
}

interface PaymentCheckoutModalProps {
  item: PaymentItem;
  onClose: () => void;
}

export function PaymentCheckoutModal({ item, onClose }: PaymentCheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'mobile_money' | 'card'>('card');
  const [countryCode, setCountryCode] = useState('US');
  const [availableMethods, setAvailableMethods] = useState<Array<'mobile_money' | 'card'>>([]);
  const [quotes, setQuotes] = useState<Partial<Record<'mobile_money' | 'card', { amount: number; currency: string }>>>(
    {}
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const paymentMethods = [
    {
      id: 'mobile_money',
      name: 'Mobile Money local',
      tag: 'Automatique',
      color: 'bg-[#1dc8fe]',
      textColor: 'text-black',
      icon: '📱',
      desc: 'Opérateur disponible dans votre pays'
    },
    {
      id: 'card',
      name: 'Carte Bancaire (Visa / Mastercard)',
      tag: '3D Secure',
      color: 'bg-[#111]',
      textColor: 'text-white',
      icon: '💳',
      desc: 'Paiement sécurisé par Stripe'
    }
  ];

  React.useEffect(() => {
    let active = true;
    (async () => {
      const geo = await detectUserGeoAndLanguage();
      const response = await authFetch('/api/payments/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: geo.countryCode,
          method: 'auto',
          productType: item.type,
          productId: item.productId
        })
      });
      const data = await response.json().catch(() => null);
      if (!active) return;
      if (!response.ok) {
        setErrorMessage(data?.error || 'Les paiements sont temporairement suspendus.');
        return;
      }
      setCountryCode(data.countryCode);
      setAvailableMethods(data.availableMethods || []);
      setQuotes(data.quotes || {});
      setSelectedMethod(data.provider === 'mobile_money' ? 'mobile_money' : 'card');
    })().catch(() => {
      if (active) setErrorMessage('Les paiements sont temporairement suspendus.');
    });
    return () => {
      active = false;
    };
  }, [item.productId, item.type]);

  const quote = quotes[selectedMethod];
  const displayAmount = quote
    ? quote.currency === 'XOF'
      ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(quote.amount)} FCFA`
      : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: quote.currency }).format(quote.amount)
    : item.amount;

  const handlePay = async () => {
    if (!availableMethods.includes(selectedMethod)) return;
    setErrorMessage('');
    setIsProcessing(true);
    triggerHaptic('medium');
    try {
      const response = await authFetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          countryCode,
          description: item.title,
          productType: item.type,
          productId: item.productId
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.paymentUrl) throw new Error(data?.error || 'Paiement indisponible.');
      window.location.assign(data.paymentUrl);
    } catch (error) {
      setIsProcessing(false);
      setErrorMessage(error instanceof Error ? error.message : 'Paiement indisponible.');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end bg-black/60 backdrop-blur-xs select-none font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        onClick={isProcessing ? undefined : onClose}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white rounded-t-[28px] max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl z-10"
      >
        {/* Top Handle */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-[17px] font-black text-black tracking-tight">Finaliser votre commande</h2>
            <p className="text-[12px] text-gray-500 font-medium">
              {availableMethods.length
                ? 'Finalisez le paiement auprès du prestataire choisi'
                : 'Les paiements sont temporairement suspendus.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-black disabled:opacity-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
          {/* Order Summary Card */}
          <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-[#480A2B] text-white flex items-center justify-center text-[18px] shadow-xs">
                {item.type === 'credits' ? '🪙' : '👑'}
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-black">{item.title}</h3>
                <p className="text-[12px] text-gray-600">
                  {item.description ||
                    (item.creditsToAdd
                      ? `+${item.creditsToAdd} crédits après confirmation du paiement`
                      : 'Activation après confirmation du paiement')}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[17px] font-black text-[#480A2B]">{displayAmount}</span>
            </div>
          </div>

          {availableMethods.length ? (
            <>
              {/* Payment Method Selector */}
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-gray-500 block mb-2 px-0.5">
                  Choisissez votre mode de paiement
                </label>

                <div className="space-y-2">
                  {paymentMethods
                    .filter((method) => availableMethods.includes(method.id as 'mobile_money' | 'card'))
                    .map((method) => {
                      const isSelected = selectedMethod === method.id;
                      return (
                        <div
                          key={method.id}
                          onClick={() => {
                            setSelectedMethod(method.id as any);
                            triggerHaptic('light');
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-black bg-gray-50 shadow-xs'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-[20px]">{method.icon}</span>
                            <div className="flex flex-col text-left">
                              <div className="flex items-center space-x-2">
                                <span className="text-[14px] font-bold text-black">{method.name}</span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-gray-200/70 text-gray-700 rounded-md">
                                  {method.tag}
                                </span>
                              </div>
                              <span className="text-[11.5px] text-gray-500 mt-0.5">{method.desc}</span>
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-black bg-black' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Dynamic input depending on method */}
              {selectedMethod === 'mobile_money' ? (
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80 space-y-1.5">
                  <label className="text-[12px] font-bold text-gray-700">Paiement Mobile Money</label>
                  <div className="flex items-center bg-white rounded-xl border border-gray-300 px-3 py-2.5 space-x-2">
                    <span className="w-full text-[14px] font-bold text-black">
                      Vous serez redirigé vers le prestataire pour finaliser le paiement.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80 text-[12px] text-gray-600">
                  Vous serez redirigé vers Stripe. Bavel ne collecte jamais votre numéro de carte.
                </div>
              )}

              {/* Security Assurance Guarantee */}
              <div className="flex items-center space-x-2 py-1 text-gray-500 text-[11.5px] justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Paiement sécurisé • Activation après confirmation du prestataire</span>
              </div>
            </>
          ) : (
            <div
              role="status"
              className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Aucun paiement ne peut être effectué pour le moment. Votre compte ne sera pas débité.</span>
            </div>
          )}

          {errorMessage && availableMethods.length > 0 && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <button
            onClick={handlePay}
            disabled={isProcessing || !availableMethods.includes(selectedMethod)}
            className="w-full py-4 rounded-full bg-[#111] hover:bg-black text-white font-extrabold text-[15px] flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Préparation du paiement...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>
                  {availableMethods.includes(selectedMethod) ? `Payer ${displayAmount}` : 'Paiements suspendus'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
