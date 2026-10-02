export const CHALLENGE_CATALOG = Object.freeze([
  { id: 'first-run', name: 'First Run', description: 'Finish a run.', goal: 1, metric: 'runsCompleted', rewardCosmeticId: 'ball:NEON' },
  { id: 'yard-wrecker', name: 'Yard Wrecker', description: 'Break five backyard props.', goal: 5, metric: 'objectsDestroyed', rewardCosmeticId: 'ball:CARBON' },
  { id: 'find-your-feet', name: 'Find Your Feet', description: 'Reach a 5x combo.', goal: 5, metric: 'highestComboObserved', rewardCosmeticId: 'trail:NEON' },
  { id: 'backyard-legend', name: 'Backyard Legend', description: 'Reach a 10x combo.', goal: 10, metric: 'highestComboObserved', rewardCosmeticId: 'trail:EMBER' },
  { id: 'read-the-throw', name: 'Read the Throw', description: 'Land a Perfect Parry.', goal: 1, metric: 'perfectParries', rewardCosmeticId: 'impact:COMIC' },
  { id: 'perfect-form', name: 'Perfect Form', description: 'Land three Perfect Parries.', goal: 3, metric: 'perfectParries', rewardCosmeticId: 'impact:ELECTRIC' },
  { id: 'kevins-problem', name: "Kevin's Problem", description: 'Hit Kevin once.', goal: 1, metric: 'kevinHits', rewardCosmeticId: 'trail:ELECTRIC' },
  { id: 'return-to-sender', name: 'Return to Sender', description: "Send one of Kevin's attacks back to him.", goal: 1, metric: 'returnedAttacks', rewardCosmeticId: 'impact:HEAVY' },
  { id: 'havoc-unleashed', name: 'Havoc Unleashed', description: 'Activate Havoc Mode.', goal: 1, metric: 'havocActivations', rewardCosmeticId: 'ball:SUNSET' }
].map(challenge => Object.freeze(challenge)));

export const CHALLENGE_BY_ID = Object.freeze(Object.fromEntries(
  CHALLENGE_CATALOG.map(challenge => [challenge.id, challenge])
));

export function getChallenge(id) {
  return CHALLENGE_BY_ID[id] || null;
}
