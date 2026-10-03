import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createVerificationNonceHash,
  evaluateProfilePhotoEvidence,
  type ProfilePhotoChallenge,
  type VerificationFaceEvidence
} from './profilePhotoVerification';

function validFrame(gestures: string[] = []): VerificationFaceEvidence {
  return {
    faceCount: 1,
    faceScore: 0.9,
    realScore: 0.9,
    liveScore: 0.9,
    gestures,
    embedding: Array.from({ length: 128 }, (_, index) => index / 128)
  };
}

function frames(challenge: ProfilePhotoChallenge): VerificationFaceEvidence[] {
  if (challenge === 'blink') {
    return [validFrame(), validFrame(['blink left eye']), validFrame(), validFrame(), validFrame()];
  }
  const target = challenge === 'turn_left' ? 'facing left' : 'facing right';
  return [
    validFrame(['facing center']),
    validFrame(),
    validFrame([target]),
    validFrame(),
    validFrame(['facing center'])
  ];
}

test('approves only when a randomized challenge and profile match pass', () => {
  for (const challenge of ['blink', 'turn_left', 'turn_right'] as const) {
    assert.deepEqual(evaluateProfilePhotoEvidence(challenge, frames(challenge), 0.75), {
      approved: true,
      reason: 'approved',
      similarity: 0.75
    });
  }
});

test('rejects invalid frame counts, ambiguous faces, and poor face quality', () => {
  assert.equal(evaluateProfilePhotoEvidence('blink', frames('blink').slice(0, 4), 0.9).reason, 'face_not_found');
  const multipleFaces = frames('blink');
  multipleFaces[2].faceCount = 2;
  assert.equal(evaluateProfilePhotoEvidence('blink', multipleFaces, 0.9).reason, 'face_not_found');
  const lowQuality = frames('blink');
  lowQuality[2].faceScore = 0.4;
  assert.equal(evaluateProfilePhotoEvidence('blink', lowQuality, 0.9).reason, 'face_quality');
});

test('rejects spoof/liveness failures, missing challenge gestures, and weak matches', () => {
  const spoof = frames('blink');
  spoof[3].realScore = 0.2;
  assert.equal(evaluateProfilePhotoEvidence('blink', spoof, 0.9).reason, 'liveness');
  assert.equal(evaluateProfilePhotoEvidence('turn_left', frames('turn_left'), 0.49).reason, 'profile_mismatch');
  assert.equal(evaluateProfilePhotoEvidence('turn_right', frames('turn_left'), 0.9).reason, 'challenge');
});

test('requires a blink transition between open-eye frames', () => {
  const blinkAtStart = frames('blink');
  blinkAtStart[1].gestures = [];
  blinkAtStart[0].gestures = ['blink left eye'];
  assert.equal(evaluateProfilePhotoEvidence('blink', blinkAtStart, 0.9).reason, 'challenge');

  const blinkWithoutReturn = frames('blink');
  blinkWithoutReturn.slice(1).forEach((frame) => {
    frame.gestures = ['blink right eye'];
  });
  assert.equal(evaluateProfilePhotoEvidence('blink', blinkWithoutReturn, 0.9).reason, 'challenge');
});

test('nonce hashes are deterministic without retaining the nonce', () => {
  const first = createVerificationNonceHash('one-time-secret');
  assert.equal(first, createVerificationNonceHash('one-time-secret'));
  assert.notEqual(first, createVerificationNonceHash('another-secret'));
  assert.match(first, /^[a-f0-9]{64}$/);
});
