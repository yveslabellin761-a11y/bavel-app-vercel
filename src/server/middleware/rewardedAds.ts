import type { RequestHandler } from 'express';

export const rewardedAdsUnavailable: RequestHandler = (_req, res) => {
  return res.status(410).json({
    success: false,
    error: 'REWARDED_ADS_UNAVAILABLE',
    message: 'Les récompenses publicitaires sont suspendues jusqu’à la validation serveur des visionnages.',
  });
};
