import { describe, expect, it, vi } from 'vitest';
import { AudioDirector } from '../src/audio_director.js';

function makeAudioPort() {
  return Object.fromEntries([
    'playKick', 'playHeader', 'playPerfectStrike', 'playPowerShotFire', 'playBlock',
    'playParry', 'playPerfectParry', 'playKevinHit', 'playReturnedProjectileReward',
    'playMaterialBreak', 'playExplosion', 'playGnomeBonk', 'playPlayerHurt',
    'playTrickChain', 'playKevinEscalation', 'playHavocStart', 'playHavocEnd',
    'updateReactiveMusic'
  ].map(name => [name, vi.fn()]));
}

describe('AudioDirector event ownership', () => {
  it('gives kick, Header, Perfect Strike and Power Shot one distinct contact recipe', () => {
    const audio = makeAudioPort();
    const director = new AudioDirector(audio);
    director.handleGameplayEvent({ type: 'BALL_CONTACT', contactType: 'KICK', combo: 2 }, { pan: -0.4 });
    director.handleGameplayEvent({ type: 'BALL_CONTACT', contactType: 'HEADER', combo: 2 }, { pan: 0.2 });
    director.handleGameplayEvent({ type: 'BALL_CONTACT', contactType: 'KICK', perfectStrike: true, combo: 3 });
    director.handleGameplayEvent({ type: 'BALL_CONTACT', contactType: 'POWER_SHOT', footballContactType: 'HEADER' });
    director.handleGameplayEvent({ type: 'POWER_SHOT', charge: 0.8 }, { pan: 0.5 });

    expect(audio.playKick).toHaveBeenCalledTimes(1);
    expect(audio.playKick).toHaveBeenCalledWith(2, { pan: -0.4 });
    expect(audio.playHeader).toHaveBeenCalledTimes(2);
    expect(audio.playPerfectStrike).toHaveBeenCalledTimes(1);
    expect(audio.playHeader).toHaveBeenCalledWith({ pan: 0.2 });
    expect(audio.playHeader).toHaveBeenCalledWith({ pan: 0 });
    expect(audio.playPowerShotFire).toHaveBeenCalledTimes(1);
    expect(audio.playPowerShotFire).toHaveBeenCalledWith(0.8, { pan: 0.5 });
  });

  it('routes Block, Parry and Perfect Parry to different recipes', () => {
    const audio = makeAudioPort();
    const director = new AudioDirector(audio);
    director.handleGameplayEvent({ type: 'BLOCK' });
    director.handleGameplayEvent({ type: 'PARRY' });
    director.handleGameplayEvent({ type: 'PERFECT_PARRY' });

    expect(audio.playBlock).toHaveBeenCalledTimes(1);
    expect(audio.playParry).toHaveBeenCalledTimes(1);
    expect(audio.playPerfectParry).toHaveBeenCalledTimes(1);
  });

  it('uses one material or signature identity for object, Kevin, damage, trick and Havoc events', () => {
    const audio = makeAudioPort();
    const director = new AudioDirector(audio);
    director.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'GLASS', objectName: 'greenhouse' }, { pan: -0.5 });
    director.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'METAL', objectName: 'destructible_grill' });
    director.handleGameplayEvent({ type: 'OBJECT_DESTROYED', material: 'CERAMIC', objectName: 'destructible_gnome' });
    director.handleGameplayEvent({ type: 'KEVIN_HIT', source: 'PARRIED_PROJECTILE' }, { pan: 0.4 });
    director.handleGameplayEvent({ type: 'PLAYER_DAMAGED' });
    director.handleGameplayEvent({ type: 'TRICK_CHAIN_COMPLETED' });
    director.handleGameplayEvent({ type: 'KEVIN_ESCALATION_CHANGED', from: 'FURIOUS', to: 'RAMPAGE' });
    director.handleGameplayEvent({ type: 'KEVIN_ESCALATION_CHANGED', to: 'ANNOYED' });
    director.handleGameplayEvent({ type: 'HAVOC_STARTED' });
    director.handleGameplayEvent({ type: 'HAVOC_ENDED' });

    expect(audio.playMaterialBreak).toHaveBeenCalledTimes(1);
    expect(audio.playMaterialBreak).toHaveBeenCalledWith('GLASS', { pan: -0.5, objectName: 'greenhouse' });
    expect(audio.playExplosion).toHaveBeenCalledTimes(1);
    expect(audio.playGnomeBonk).toHaveBeenCalledTimes(1);
    expect(audio.playKevinHit).toHaveBeenCalledTimes(1);
    expect(audio.playReturnedProjectileReward).toHaveBeenCalledTimes(1);
    expect(audio.playReturnedProjectileReward).toHaveBeenCalledWith({ pan: 0.4 });
    expect(audio.playPlayerHurt).toHaveBeenCalledTimes(1);
    expect(audio.playTrickChain).toHaveBeenCalledTimes(1);
    expect(audio.playKevinEscalation).toHaveBeenCalledTimes(1);
    expect(audio.playKevinEscalation).toHaveBeenCalledWith('RAMPAGE');
    expect(audio.playHavocStart).toHaveBeenCalledTimes(1);
    expect(audio.playHavocEnd).toHaveBeenCalledTimes(1);
  });

  it('plays escalation stings only for upward moves into an intense state', () => {
    const audio = makeAudioPort();
    const director = new AudioDirector(audio);
    const transitions = [
      ['ANNOYED', 'ANGRY'],
      ['ANGRY', 'FURIOUS'],
      ['FURIOUS', 'RAMPAGE']
    ];

    for (const [from, to] of transitions) {
      director.handleGameplayEvent({ type: 'KEVIN_ESCALATION_CHANGED', from, to });
    }

    expect(audio.playKevinEscalation.mock.calls).toEqual([['ANGRY'], ['FURIOUS'], ['RAMPAGE']]);
  });

  it('suppresses downward and same-state stings while updating reactive music', () => {
    const audio = makeAudioPort();
    const director = new AudioDirector(audio);
    const snapshot = { kevinState: 'FURIOUS' };
    const transitions = [
      ['RAMPAGE', 'FURIOUS'],
      ['FURIOUS', 'ANGRY'],
      ['ANGRY', 'ANNOYED'],
      ['ANGRY', 'ANGRY']
    ];

    for (const [from, to] of transitions) {
      director.handleGameplayEvent({ type: 'KEVIN_ESCALATION_CHANGED', from, to }, {}, snapshot);
    }

    expect(audio.playKevinEscalation).not.toHaveBeenCalled();
    expect(audio.updateReactiveMusic).toHaveBeenCalledTimes(transitions.length);
    expect(audio.updateReactiveMusic).toHaveBeenNthCalledWith(1, snapshot);
  });

  it('fails safely for unknown escalation states and still updates reactive music', () => {
    const audio = makeAudioPort();
    const director = new AudioDirector(audio);
    const snapshot = { kevinState: 'CALM' };

    expect(() => director.handleGameplayEvent({ type: 'KEVIN_ESCALATION_CHANGED', from: 'MYSTERY', to: 'RAMPAGE' }, {}, snapshot)).not.toThrow();
    expect(() => director.handleGameplayEvent({ type: 'KEVIN_ESCALATION_CHANGED', from: 'ANGRY', to: 'UNKNOWN' }, {}, snapshot)).not.toThrow();
    expect(audio.playKevinEscalation).not.toHaveBeenCalled();
    expect(audio.updateReactiveMusic).toHaveBeenCalledTimes(2);
  });

  it('updates music presentation from gameplay snapshots without changing those snapshots', () => {
    const audio = makeAudioPort();
    const director = new AudioDirector(audio);
    const snapshot = Object.freeze({ combo: 8, kevinState: 'FURIOUS', havocActive: true, gameState: 'PLAYING' });

    director.handleGameplayEvent({ type: 'COMBO_CHANGED', current: 8 }, {}, snapshot);

    expect(audio.updateReactiveMusic).toHaveBeenCalledWith(snapshot);
    expect(director.getDiagnosticSnapshot()).toMatchObject({
      events: { COMBO_CHANGED: 1 },
      cues: { musicState: 1 }
    });
    expect(snapshot).toEqual({ combo: 8, kevinState: 'FURIOUS', havocActive: true, gameState: 'PLAYING' });
  });
});
