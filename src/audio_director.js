export class AudioDirector {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;
    this.eventCounts = Object.create(null);
    this.cueCounts = Object.create(null);
    this.audioFailures = 0;
  }

  count(target, name) {
    target[name] = (target[name] || 0) + 1;
  }

  play(cue, method, ...args) {
    const play = this.soundEngine?.[method];
    if (typeof play !== 'function') return false;
    this.count(this.cueCounts, cue);
    try {
      play.apply(this.soundEngine, args);
    } catch (_) {
      this.audioFailures++;
    }
    return true;
  }

  duck(type) {
    try {
      this.soundEngine?.duckMusicForEvent?.(type);
    } catch (_) {
      this.audioFailures++;
    }
  }

  handleGameplayEvent(event, context = {}, stateSnapshot = null) {
    if (!event || typeof event.type !== 'string') return false;
    this.count(this.eventCounts, event.type);
    const spatial = { pan: Number.isFinite(context.pan) ? context.pan : 0 };
    let handled = true;

    switch (event.type) {
      case 'BALL_CONTACT': {
        if (event.contactType === 'POWER_SHOT') {
          if (event.footballContactType === 'HEADER') {
            this.play('header', 'playHeader', spatial);
          }
        } else if (event.perfectStrike) {
          this.play('perfectStrike', 'playPerfectStrike', { ...spatial, header: event.contactType === 'HEADER' });
        } else if (event.contactType === 'HEADER') {
          this.play('header', 'playHeader', spatial);
        } else {
          this.play('normalKick', 'playKick', event.combo, spatial);
        }
        break;
      }
      case 'POWER_SHOT':
        this.play('powerShot', 'playPowerShotFire', event.charge, spatial);
        this.duck('POWER_SHOT');
        break;
      case 'BLOCK':
        this.play('block', 'playBlock', spatial);
        break;
      case 'PARRY':
        this.play('parry', 'playParry', spatial);
        this.duck('PARRY');
        break;
      case 'PERFECT_PARRY':
        this.play('perfectParry', 'playPerfectParry', spatial);
        this.duck('PERFECT_PARRY');
        break;
      case 'KEVIN_HIT':
        this.play('kevinHit', 'playKevinHit', spatial);
        if (event.source === 'PARRIED_PROJECTILE') {
          this.play('returnedReward', 'playReturnedProjectileReward', spatial);
        }
        this.duck('KEVIN_HIT');
        break;
      case 'OBJECT_DESTROYED': {
        const objectName = String(event.objectName || '').toLowerCase();
        if (objectName.includes('grill')) {
          this.play('grillExplosion', 'playExplosion', spatial);
        } else if (objectName.includes('gnome')) {
          this.play('gnomeBonk', 'playGnomeBonk', spatial);
        } else {
          this.play('materialBreak', 'playMaterialBreak', event.material, {
            ...spatial,
            objectName: event.objectName
          });
        }
        break;
      }
      case 'PLAYER_DAMAGED':
        this.play('playerDamage', 'playPlayerHurt', spatial);
        this.duck('PLAYER_DAMAGED');
        break;
      case 'TRICK_CHAIN_COMPLETED':
        this.play('trickChain', 'playTrickChain');
        this.duck('TRICK_CHAIN');
        break;
      case 'KEVIN_ESCALATION_CHANGED': {
        const next = String(event.toState || event.to || event.current || '').toUpperCase();
        const previous = String(event.fromState || event.from || event.previous || '').toUpperCase();
        if (['ANGRY', 'FURIOUS', 'RAMPAGE'].includes(next) && next !== previous) {
          this.play('kevinEscalation', 'playKevinEscalation', next);
        }
        this.updateMusic(stateSnapshot);
        break;
      }
      case 'HAVOC_STARTED':
        this.play('havocStart', 'playHavocStart');
        this.duck('HAVOC_STARTED');
        this.updateMusic(stateSnapshot);
        break;
      case 'HAVOC_ENDED':
        this.play('havocEnd', 'playHavocEnd');
        this.updateMusic(stateSnapshot);
        break;
      case 'COMBO_CHANGED':
        this.updateMusic(stateSnapshot);
        if ([5, 10, 15].includes(event.current)) {
          this.play('comboMilestone', 'playComboMilestoneFanfare');
        }
        break;
      default:
        handled = false;
        break;
    }

    return handled;
  }

  updateMusic(snapshot) {
    if (!snapshot || typeof this.soundEngine?.updateReactiveMusic !== 'function') return;
    this.count(this.cueCounts, 'musicState');
    try {
      this.soundEngine.updateReactiveMusic(snapshot);
    } catch (_) {
      this.audioFailures++;
    }
  }

  getDiagnosticSnapshot() {
    return {
      events: { ...this.eventCounts },
      cues: { ...this.cueCounts },
      audioFailures: this.audioFailures
    };
  }
}
