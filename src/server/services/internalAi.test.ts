import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  answerFaq,
  analyzeBehavior,
  assessDeceptionSignals,
  compareQuizAnswers,
  matchProfiles,
  moderateText,
  rankProfiles,
} from './internalAi';

describe('Bavel internal AI rules', () => {
  it('ranks profiles using available shared data and excludes prior interactions', () => {
    const ranked = rankProfiles(
      { interests: ['cinéma', 'voyage'], city: 'Abidjan', age: 28 },
      [
        { id: 'shared', interests: ['cinéma', 'voyage'], city: 'Abidjan', age: 28 },
        { id: 'other', interests: ['sport'], city: 'Bouaké', age: 35 },
        { id: 'liked', interests: ['cinéma'], city: 'Abidjan', age: 28 },
      ],
      { likedIds: ['liked'] }
    );

    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].aiMatchScore, 100);
    assert.ok(ranked[1].aiMatchScore !== null && ranked[1].aiMatchScore < 100);
  });

  it('personalizes ordering from repeated likes and passes without changing compatibility scores', () => {
    const ranked = rankProfiles(
      { city: 'Abidjan', age: 28 },
      [
        { id: 'liked-interest', interests: ['jazz'], city: 'Abidjan', age: 28 },
        { id: 'passed-interest', interests: ['sport'], city: 'Abidjan', age: 28 },
      ],
      {
        behavioralHistory: [
          { eventType: 'like', profile: { interests: ['jazz'] } },
          { eventType: 'superlike', profile: { interests: ['jazz'] } },
          { eventType: 'pass', profile: { interests: ['sport'] } },
        ],
      }
    );

    assert.equal(ranked[0].aiMatchScore, ranked[1].aiMatchScore);
    assert.ok(ranked[0].aiPersonalizationScore > ranked[1].aiPersonalizationScore);
  });

  it('does not infer taste from fewer than three recorded swipes', () => {
    const ranked = rankProfiles(
      { city: 'Abidjan', age: 28 },
      [{ id: 'candidate', interests: ['jazz'], city: 'Abidjan', age: 28 }],
      {
        behavioralHistory: [
          { eventType: 'like', profile: { interests: ['jazz'] } },
          { eventType: 'like', profile: { interests: ['jazz'] } },
        ],
      }
    );

    assert.equal(ranked[0].aiPersonalizationScore, null);
  });

  it('trains a local logistic ranker from enough positive and negative swipe examples', () => {
    const user = { interests: ['jazz'], city: 'Paris', age: 30 };
    const behavioralHistory = [
      ...Array.from({ length: 6 }, () => ({
        eventType: 'like',
        profile: { interests: ['jazz'], city: 'Paris', age: 30, bio: 'Musique et jazz' },
      })),
      ...Array.from({ length: 6 }, () => ({
        eventType: 'pass',
        profile: { interests: ['sport'], city: 'Lyon', age: 55 },
      })),
    ];
    const ranked = rankProfiles(
      user,
      [
        { id: 'liked-pattern', interests: ['jazz'], city: 'Paris', age: 30 },
        { id: 'passed-pattern', interests: ['sport'], city: 'Lyon', age: 55 },
      ],
      { behavioralHistory }
    );
    assert.equal(ranked[0].aiRankingMethod, 'personalized-logistic-regression');
    assert.equal(ranked[0].aiModelSampleSize, 12);
    assert.ok(ranked[0].aiRankingScore > ranked[1].aiRankingScore);
  });

  it('does not invent a compatibility score when profiles lack comparison data', () => {
    assert.equal(matchProfiles({}, {}).score, null);
  });

  it('returns conservative moderation signals for text matching known risk patterns', () => {
    const result = moderateText("Transfère de l'argent sur WhatsApp");

    assert.equal(result.isSafe, false);
    assert.equal(result.severity, 'high');
    assert.ok(result.categories.includes('financial_solicitation'));
    assert.ok(result.categories.includes('offplatform_redirect'));
  });

  it('compares only quiz questions answered by both people', () => {
    const result = compareQuizAnswers(
      { '1': 'Voyage', '2': 'Cinéma' },
      { '1': 'voyage', '3': 'Sport' }
    );

    assert.equal(result.score, 100);
    assert.match(result.comment, /1 réponse identique sur 1 question comparée/);
  });

  it('does not make verification claims in FAQ answers for unavailable image analysis', () => {
    const result = answerFaq('Est-ce que ma photo est analysée automatiquement ?');

    assert.match(result.answer, /n’est pas activée/);
    assert.equal(result.action, null);
  });

  it('requests human review when activity signals are insufficient', () => {
    const result = analyzeBehavior({});

    assert.equal(result.behaviorType, 'insufficient_data');
    assert.equal(result.recommendedAction, 'review');
  });

  it('sends corroborated behavioral risk for human review without automatic blocking', () => {
    const result = assessDeceptionSignals({
      accountAgeHours: 24,
      outboundSwipes24h: 80,
      financialMessages7d: 1,
      textMessageCount7d: 10,
      repeatedMessageRatio7d: 0.7,
      distinctPendingReports30d: 0,
      blocksReceived30d: 0,
    });

    assert.equal(result.recommendedAction, 'human_review');
    assert.equal(result.isFake, null);
    assert.equal(result.isBlocked, false);
    assert.equal(result.riskScore, 70);
  });

  it('does not escalate isolated user reports into a fraud finding', () => {
    const result = assessDeceptionSignals({
      accountAgeHours: 240,
      outboundSwipes24h: 8,
      distinctPendingReports30d: 10,
      blocksReceived30d: 0,
    });

    assert.equal(result.recommendedAction, 'no_action');
    assert.equal(result.isFake, null);
    assert.equal(result.isBlocked, false);
  });
});
