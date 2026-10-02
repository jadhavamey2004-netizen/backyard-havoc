/**
 * Local, rule-based cosmetic dialogue and telemetry simulation for Backyard Havoc.
 * This module has no network client and is not gameplay AI: rage only selects dialogue text.
 */

export const KEVIN_DIALOGUE_POOL = {
  FIRST_HIT: [
    { text: "Hey! What was that thud? Don't tell me those kids are at it again!", emotion: 'SARCASTIC', rageMin: 0, rageMax: 40 },
    { text: "I just sat down with my afternoon tea! Keep that ball on YOUR side of the fence!", emotion: 'SARCASTIC', rageMin: 0, rageMax: 40 },
    { text: "I heard that! One scuff on my cedar fence and I'm calling your parents!", emotion: 'SARCASTIC', rageMin: 0, rageMax: 40 }
  ],

  GARDEN: [
    { text: "MY HYDRANGEAS! (sobs) You just turned twenty years of pruning into confetti!", emotion: 'CRYING', rageMin: 0, rageMax: 60 },
    { text: "(gasp) That birdbath was hand-carved in Tuscany! Do you know what that COST me?!", emotion: 'PANIC', rageMin: 10, rageMax: 70 },
    { text: "Those petunias took me THREE SUMMERS to cultivate, and you smashed them in three seconds!", emotion: 'RAGE', rageMin: 20, rageMax: 80 },
    { text: "Get away from my flowerbeds! I swear I will call the HOA, the police, AND your mother!", emotion: 'RAGE', rageMin: 30, rageMax: 90 },
    { text: "(sobs) The begonias! Look at the petals! It's a botanical massacre out here!", emotion: 'CRYING', rageMin: 10, rageMax: 70 },
    { text: "Do you have any idea how much fertilizer and love went into that topiary?!", emotion: 'RAGE', rageMin: 25, rageMax: 85 },
    { text: "Organic heirloom soil scattered across the lawn! You're paying for the mulch!", emotion: 'RAGE', rageMin: 20, rageMax: 75 },
    { text: "(sigh) The Japanese maples were winning Best in County until five seconds ago.", emotion: 'SARCASTIC', rageMin: 0, rageMax: 50 }
  ],

  WINDOW: [
    { text: "(screams) MY WINDOW! That is coming directly out of your allowance, every last penny!", emotion: 'RAGE', rageMin: 20, rageMax: 85 },
    { text: "(gasp) Did you hear that crack? That sounded like my insurance deductible launching into orbit!", emotion: 'PANIC', rageMin: 10, rageMax: 70 },
    { text: "WHO is paying for that glass?! YOU are paying for it! I am taking this to small claims court!", emotion: 'RAGE', rageMin: 30, rageMax: 95 },
    { text: "Oh brilliant. My bedroom is now an open-air wind tunnel. (sigh) Thank you SO much for that.", emotion: 'SARCASTIC', rageMin: 0, rageMax: 50 },
    { text: "Double-paned, argon-insulated, custom German glass! Smashed into smithereens!", emotion: 'PANIC', rageMin: 25, rageMax: 85 },
    { text: "I have glass shards in my slippers! IN MY SLIPPERS! This is domestic terrorism!", emotion: 'RAGE', rageMin: 50, rageMax: 100 },
    { text: "(screams) Another pane bites the dust! I might as well live in a gazebo at this rate!", emotion: 'RAGE', rageMin: 40, rageMax: 100 },
    { text: "That window was historic stained mahogany trim! Historic! Gone in an instant!", emotion: 'CRYING', rageMin: 20, rageMax: 75 }
  ],

  GREENHOUSE: [
    { text: "(screams) THE CONSERVATORY! My rare orchid collection! TWENTY YEARS of breeding, GONE!", emotion: 'PANIC', rageMin: 20, rageMax: 90 },
    { text: "Glass raining everywhere! Are you running a DEMOLITION DERBY through my backyard?!", emotion: 'RAGE', rageMin: 30, rageMax: 100 },
    { text: "(gasp) A direct hit on the skylight! Call the glazier! Call the governor! Call EVERYONE!", emotion: 'PANIC', rageMin: 20, rageMax: 85 },
    { text: "(sobs) The greenhouse climate control! The humidity was calibrated to sixty-two percent!", emotion: 'CRYING', rageMin: 15, rageMax: 75 },
    { text: "My prized hydroponic cherry tomatoes are crushed! Crushed under shattered tempered glass!", emotion: 'RAGE', rageMin: 35, rageMax: 95 },
    { text: "That conservatory roof was reinforced acrylic! How hard did you even kick that ball?!", emotion: 'PANIC', rageMin: 25, rageMax: 85 }
  ],

  GRILL: [
    { text: "(screams) MY WEBER GRILL! The prime ribeyes were RESTING on that! Do you know how long I marinated those?!", emotion: 'RAGE', rageMin: 30, rageMax: 100 },
    { text: "FIRE! FIRE IN THE BACKYARD! (gasp) Someone activate the sprinklers IMMEDIATELY!", emotion: 'PANIC', rageMin: 20, rageMax: 90 },
    { text: "You just knocked over FOUR HUNDRED DEGREES of burning charcoal, you absolute MANIAC!", emotion: 'RAGE', rageMin: 40, rageMax: 100 },
    { text: "The hickory smoke! The dry rub seasoning! Gone! Smeared across the patio stones!", emotion: 'CRYING', rageMin: 15, rageMax: 70 },
    { text: "I spent three hours getting the mesquite coals to the perfect sear temperature!", emotion: 'RAGE', rageMin: 25, rageMax: 85 },
    { text: "(gasp) The propane valve is hissing! Run for your lives! He's weaponized the barbecue!", emotion: 'PANIC', rageMin: 45, rageMax: 100 }
  ],

  GNOME: [
    { text: "NOT BARTHOLOMEW! That gnome was a family heirloom from the Black Forest!", emotion: 'CRYING', rageMin: 10, rageMax: 75 },
    { text: "You decapitated my garden guardian! That ceramic gnome had sentimental value!", emotion: 'RAGE', rageMin: 20, rageMax: 80 },
    { text: "(gasp) Bartholomew's pointy red hat is in two pieces! You monster!", emotion: 'PANIC', rageMin: 15, rageMax: 70 },
    { text: "Leave the gnomes alone! What did a six-inch bearded statue ever do to you?!", emotion: 'RAGE', rageMin: 25, rageMax: 85 }
  ],

  TRASHCAN: [
    { text: "My stainless steel recycling bin! You dented the hydraulic soft-close lid!", emotion: 'RAGE', rageMin: 10, rageMax: 70 },
    { text: "(sigh) Great. Aluminum cans scattered across the driveway on trash night.", emotion: 'SARCASTIC', rageMin: 0, rageMax: 50 },
    { text: "Do you have any respect for municipal sanitation ordinances?! NONE WHATSOEVER!", emotion: 'RAGE', rageMin: 25, rageMax: 80 }
  ],

  BICYCLE: [
    { text: "My vintage ten-speed cruiser! You warped the chrome rims with a football!", emotion: 'RAGE', rageMin: 15, rageMax: 80 },
    { text: "(sobs) The derailleur was precision-tuned by an Italian bike mechanic last Tuesday!", emotion: 'CRYING', rageMin: 10, rageMax: 70 },
    { text: "That bicycle was mint condition 1984! You're buying me a new titanium frame!", emotion: 'RAGE', rageMin: 30, rageMax: 90 }
  ],

  HEADSHOT: [
    { text: "(screams) Ouch! Direct hit to my head! That is assault with a deadly football!", emotion: 'RAGE', rageMin: 0, rageMax: 100 },
    { text: "MY GLASSES! (gasp) I can't see! Everything is blurry! You are going to PAY for new bifocals!", emotion: 'PANIC', rageMin: 0, rageMax: 100 },
    { text: "My chiropractor is going to have a FIELD DAY with this! (sobs) You gave me whiplash!", emotion: 'CRYING', rageMin: 0, rageMax: 100 },
    { text: "THAT DOES IT! You want a war? HERE COMES A FLOWERPOT STRAIGHT TO YOUR DOME!", emotion: 'RAGE', rageMin: 0, rageMax: 100 },
    { text: "(screams) Right in the snout! I have a concussion and a profound grudge!", emotion: 'RAGE', rageMin: 0, rageMax: 100 },
    { text: "Who throws a football at a second-story retiree?! I was doing the Sunday crossword!", emotion: 'PANIC', rageMin: 0, rageMax: 100 }
  ],

  FIREBALL: [
    { text: "(gasp) IS THAT BALL ON FIRE?! He's kicking LIT METEORS into my backyard!", emotion: 'PANIC', rageMin: 10, rageMax: 100 },
    { text: "FIRE HAZARD! Arson! Call 911! The delinquent has unlocked pyrotechnics!", emotion: 'PANIC', rageMin: 20, rageMax: 100 },
    { text: "(screams) The cedar fence is scorching! Someone grab the garden hose!", emotion: 'PANIC', rageMin: 30, rageMax: 100 },
    { text: "You're kicking burning plasma into a residential zone! This is an HOA code violation!", emotion: 'RAGE', rageMin: 25, rageMax: 95 }
  ],

  HIGH_COMBO: [
    { text: "How is that ball still in the air?! (gasp) Gravity doesn't work like that! Stop it!", emotion: 'PANIC', rageMin: 20, rageMax: 90 },
    { text: "(screams) Ten juggles in a row?! You're charging kinetic energy like a superhero villain!", emotion: 'PANIC', rageMin: 30, rageMax: 100 },
    { text: "Quit showing off your street juggling skills and get off my property!", emotion: 'RAGE', rageMin: 25, rageMax: 85 }
  ],

  RAMPAGE: [
    { text: "(screams) ARE YOU TOTALLY DERANGED?! You just obliterated three yards in four seconds!", emotion: 'RAGE', rageMin: 40, rageMax: 100 },
    { text: "STOP! CEASE FIRE! (panic) You are dismantling the entire neighborhood block by block!", emotion: 'PANIC', rageMin: 40, rageMax: 100 },
    { text: "This isn't soccer anymore, this is an urban demolition contract! (screams)", emotion: 'RAGE', rageMin: 50, rageMax: 100 },
    { text: "(sobs) The whole patio is rubble! Pots, windows, grill! Everything is ruined!", emotion: 'CRYING', rageMin: 40, rageMax: 100 }
  ],

  PARRY_SURVIVED: [
    { text: "(gasp) You PARRIED my flowerpot back at me?! Where did you learn physics like that?!", emotion: 'PANIC', rageMin: 30, rageMax: 100 },
    { text: "Reflecting projectiles?! (screams) That was my best steel wrench!", emotion: 'RAGE', rageMin: 40, rageMax: 100 },
    { text: "Hey! You can't just return to sender my heavy lawn artillery!", emotion: 'RAGE', rageMin: 35, rageMax: 95 }
  ],

  ESCALATION_WARNING: [
    { text: "That is the LAST STRAW! You think I'm just going to watch from up here?!", emotion: 'RAGE', rageMin: 50, rageMax: 90 },
    { text: "Arming the projectile catapult! Let's see how you juggle heavy footwear!", emotion: 'RAGE', rageMin: 55, rageMax: 95 }
  ],

  CALM_COMEBACK: [
    { text: "(sigh) Finally, some peace and quiet. If one more ball comes over this fence, so help me...", emotion: 'SARCASTIC', rageMin: 0, rageMax: 30 },
    { text: "I'm watching through the blinds with binoculars. Don't test me.", emotion: 'SARCASTIC', rageMin: 0, rageMax: 30 }
  ],

  DEFAULT: [
    { text: "I am WATCHING you! One more bounce near my fence and it is ALL-OUT WAR!", emotion: 'RAGE', rageMin: 10, rageMax: 60 },
    { text: "(sigh) Can't a retired man enjoy his afternoon without airborne leather missiles?", emotion: 'SARCASTIC', rageMin: 0, rageMax: 40 },
    { text: "I see EXACTLY what you are doing, and my attorney WILL be in touch. Mark my words.", emotion: 'SARCASTIC', rageMin: 0, rageMax: 50 },
    { text: "You're scaring the cardinals away from my bird feeder with that racket!", emotion: 'RAGE', rageMin: 10, rageMax: 55 }
  ]
};

export class EdgeAIService {
  constructor() {
    this.activeBubble = null;
    this.bubbleTimeout = null;
    this.dialogueListeners = [];
    this.telemetryListeners = [];
    this.sessionGeneration = 0;
    this.pendingResponseTimers = new Set();

    // Session Memory & Rampage Tracking
    this.destructionCounts = {
      window: 0,
      greenhouse: 0,
      grill: 0,
      garden: 0,
      gnome: 0,
      trashcan: 0,
      bicycle: 0,
      total: 0
    };
    this.recentDestructions = []; // timestamps within last 4s
    this.hasWarnedEscalation = false;
    this.hasFirstHitHappened = false;
    this.currentNpcRage = 0;
  }

  setNpcRage(rage) {
    this.currentNpcRage = Math.max(0, Math.min(100, rage));
  }

  onDialogue(callback) {
    this.dialogueListeners.push(callback);
  }

  onTelemetry(callback) {
    this.telemetryListeners.push(callback);
  }

  resetSession() {
    this.sessionGeneration++;
    for (const timer of this.pendingResponseTimers) clearTimeout(timer);
    this.pendingResponseTimers.clear();
    this.destructionCounts = {
      window: 0,
      greenhouse: 0,
      grill: 0,
      garden: 0,
      gnome: 0,
      trashcan: 0,
      bicycle: 0,
      total: 0
    };
    this.recentDestructions = [];
    this.hasWarnedEscalation = false;
    this.hasFirstHitHappened = false;
    this.currentNpcRage = 0;
    this.lastDialogueDispatch = null;
  }

  /**
   * Dispatch local telemetry and schedule cosmetic dialogue selection.
   */
  dispatchTelemetry(event) {
    const now = Date.now();
    const isHeadshot = (event.environmental_tags || []).includes('HEADSHOT') || (event.impact_object || '').includes('Kevin');
    const isParry = (event.environmental_tags || []).includes('PARRY_RETURN');

    // Update destruction count tracking
    this.destructionCounts.total++;
    this.recentDestructions.push(now);
    this.recentDestructions = this.recentDestructions.filter(t => now - t <= 4000);

    const objLower = (event.impact_object || '').toLowerCase();
    if (objLower.includes('window')) this.destructionCounts.window++;
    else if (objLower.includes('greenhouse') || objLower.includes('conservatory') || objLower.includes('glass')) this.destructionCounts.greenhouse++;
    else if (objLower.includes('grill') || objLower.includes('bbq')) this.destructionCounts.grill++;
    else if (objLower.includes('gnome')) this.destructionCounts.gnome++;
    else if (objLower.includes('trash')) this.destructionCounts.trashcan++;
    else if (objLower.includes('bike') || objLower.includes('bicycle')) this.destructionCounts.bicycle++;
    else if (objLower.includes('flower') || objLower.includes('pot') || objLower.includes('garden')) this.destructionCounts.garden++;

    const isRampage = this.recentDestructions.length >= 3;
    const isFirstHit = !this.hasFirstHitHappened && !isHeadshot;
    if (isFirstHit) this.hasFirstHitHappened = true;

    const payload = {
      timestamp: now,
      event_id: `EVT-${Math.floor(Math.random() * 9000 + 1000)}`,
      npc_id: event.npc_id || 'grumpy_neighbor_kevin',
      npc_sentiment: isHeadshot ? 'ENRAGED' : (isRampage ? 'PANIC_FURY' : (event.combo_multiplier >= 5 ? 'FURIOUS' : 'IRRITATED')),
      impact_object: event.impact_object || 'Prop',
      combo_multiplier: event.combo_multiplier || 1,
      ball_type: event.ball_type || 'Standard Leather',
      ball_velocity_mps: event.ball_velocity || 20,
      environmental_tags: event.environmental_tags || ['DESTRUCTION'],
      edge_latency_ms: Math.floor(Math.random() * 25 + 40),
      isHeadshot,
      isParry,
      isRampage,
      isFirstHit,
      npcRage: event.npcRage !== undefined ? event.npcRage : this.currentNpcRage
    };

    // Notify telemetry HUD immediately
    for (const listener of this.telemetryListeners) {
      listener(payload);
    }

    // Skip dispatching duplicate dialogue for headshots (already voiced immediately by takeDirectHit)
    if (isHeadshot) return;

    // Preserve the local cosmetic response delay; it cannot affect gameplay state.
    const sessionGeneration = this.sessionGeneration;
    const timer = setTimeout(() => {
      this.pendingResponseTimers.delete(timer);
      if (sessionGeneration !== this.sessionGeneration) return;
      this.handleEdgeResponse(payload);
    }, payload.edge_latency_ms);
    this.pendingResponseTimers.add(timer);
  }

  handleEdgeResponse(payload) {
    const now = Date.now();
    let pool = KEVIN_DIALOGUE_POOL.DEFAULT;
    let priority = 3; // 0=CRITICAL, 1=HIGH, 2=MED, 3=LOW

    // Rate-limit reactive dialogue to at most 1 spoken line per 3.5s
    if (this.lastDialogueDispatch && (now - this.lastDialogueDispatch < 3500)) {
      return;
    }
    const objLower = (payload.impact_object || '').toLowerCase();
    const rage = payload.npcRage !== undefined ? payload.npcRage : this.currentNpcRage;
    const ballTypeLower = (payload.ball_type || '').toLowerCase();

    if (payload.isHeadshot) {
      pool = KEVIN_DIALOGUE_POOL.HEADSHOT;
      priority = 0; // CRITICAL
    } else if (payload.isParry) {
      pool = KEVIN_DIALOGUE_POOL.PARRY_SURVIVED;
      priority = 1; // HIGH
    } else if (payload.isRampage) {
      pool = KEVIN_DIALOGUE_POOL.RAMPAGE;
      priority = 1; // HIGH
    } else if (ballTypeLower.includes('fire') && Math.random() < 0.6) {
      pool = KEVIN_DIALOGUE_POOL.FIREBALL;
      priority = 2;
    } else if (payload.combo_multiplier >= 8 && Math.random() < 0.5) {
      pool = KEVIN_DIALOGUE_POOL.HIGH_COMBO;
      priority = 2;
    } else if (payload.isFirstHit) {
      pool = KEVIN_DIALOGUE_POOL.FIRST_HIT;
      priority = 2;
    } else if (objLower.includes('gnome')) {
      pool = KEVIN_DIALOGUE_POOL.GNOME;
      priority = 3;
    } else if (objLower.includes('trash')) {
      pool = KEVIN_DIALOGUE_POOL.TRASHCAN;
      priority = 3;
    } else if (objLower.includes('bike') || objLower.includes('bicycle')) {
      pool = KEVIN_DIALOGUE_POOL.BICYCLE;
      priority = 3;
    } else if (objLower.includes('flower') || objLower.includes('garden') || objLower.includes('hydrangea') || objLower.includes('pot') || objLower.includes('birdbath')) {
      pool = KEVIN_DIALOGUE_POOL.GARDEN;
      priority = 3;
    } else if (objLower.includes('window')) {
      pool = KEVIN_DIALOGUE_POOL.WINDOW;
      priority = 2;
    } else if (objLower.includes('greenhouse') || objLower.includes('conservatory') || objLower.includes('glass')) {
      pool = KEVIN_DIALOGUE_POOL.GREENHOUSE;
      priority = 2;
    } else if (objLower.includes('grill') || objLower.includes('bbq')) {
      pool = KEVIN_DIALOGUE_POOL.GRILL;
      priority = 2;
    }

    // Rage-gated line selection
    const eligibleLines = pool.filter(item => {
      const min = item.rageMin !== undefined ? item.rageMin : 0;
      const max = item.rageMax !== undefined ? item.rageMax : 100;
      return rage >= min && rage <= max;
    });

    const candidatePool = eligibleLines.length > 0 ? eligibleLines : pool;
    let picked = candidatePool[Math.floor(Math.random() * candidatePool.length)] || {
      text: "WATCH IT! Leave my yard alone, you delinquent!",
      emotion: 'RAGE'
    };

    // Inject dynamic count references if high destruction count
    let dynamicText = picked.text;
    if (objLower.includes('window') && this.destructionCounts.window >= 3 && !payload.isHeadshot && Math.random() < 0.4) {
      dynamicText = `THAT'S WINDOW NUMBER ${this.destructionCounts.window}! (screams) You are systematically glassing my residence!`;
      priority = 1;
    }

    this.lastDialogueDispatch = Date.now();

    for (const listener of this.dialogueListeners) {
      listener(dynamicText, picked.emotion, priority);
    }
  }
}

export const aiService = new EdgeAIService();
