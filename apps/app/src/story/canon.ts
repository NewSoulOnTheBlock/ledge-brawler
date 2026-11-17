// spec/app/saga.md, "Story: Play five campaigns"; spec/app/saga.md, "Story: Learn the truth five ways"; spec/app/saga.md, "Story: Change the world"
// The canon of The Five Blades (master story bible, version 1.0), as data: what happened, apart from what any
// protagonist knows, which is the saga's to record. Everything marked provisional in the bible is provisional here.

/** The five protagonists, in the saga's order and the recommended order of play. */
export type Hero = "forbidden" | "ember" | "exile" | "hollow" | "architect";
export const HEROES: Hero[] = ["forbidden", "ember", "exile", "hollow", "architect"];

export type RegionId = "crownlands" | "ashenReach" | "paleNorth" | "drownedWilds" | "hollowBelow";
export interface Region { id: RegionId; name: string; theme: string; about: string; landmark: string; landmarkAbout: string; palette: { sky: string; far: string; near: string; ground: string } }

/** Vareth's five regions. Each has its own look; the palettes are what a level in that region is drawn in. */
export const REGIONS: Region[] = [
  { id: "crownlands", name: "The Crownlands", theme: "Power, wealth, religion, and corruption",
    about: "The political centre of Vareth. Noble houses, royal courts, magical academies, religious institutions and mercenary companies compete for influence.",
    landmark: "Blackspire", landmarkAbout: "A fortified city built around an ancient subterranean structure.",
    palette: { sky: "#f4f1ea", far: "#e2dccf", near: "#cfc6b4", ground: "#1b1820" } },
  { id: "ashenReach", name: "The Ashen Reach", theme: "Survival, industry, and rebellion",
    about: "A volcanic frontier of mining settlements, industrial fortresses, outlaw territories and enormous underground furnaces.",
    landmark: "Cinderfall", landmarkAbout: "A mining settlement whose population was sacrificed to an ancient magical experiment.",
    palette: { sky: "#f6ebe2", far: "#e8cdb9", near: "#d3a68b", ground: "#2a1612" } },
  { id: "paleNorth", name: "The Pale North", theme: "Tradition, discipline, and forgotten knowledge",
    about: "Frozen mountains, ancient monasteries, isolated villages, and battlefields preserved beneath glaciers.",
    landmark: "The Monastery of Nine Bells", landmarkAbout: "Home to one of the oldest surviving blade traditions.",
    palette: { sky: "#f3f7fa", far: "#dbe6ee", near: "#bfd0dc", ground: "#16202a" } },
  { id: "drownedWilds", name: "The Drowned Wilds", theme: "Death, memory, and nature",
    about: "A sprawling forest and wetland of flooded cities, abandoned settlements and ancient burial grounds.",
    landmark: "The Weeping City", landmarkAbout: "Where the dead occasionally appear to speak with the living.",
    palette: { sky: "#eef4ee", far: "#d2e0d3", near: "#afc4b2", ground: "#12201a" } },
  { id: "hollowBelow", name: "The Hollow Below", theme: "The origin of things that should not exist",
    about: "An underground world of buried civilizations, impossible architecture, ancient machinery and supernatural entities.",
    landmark: "The First Vault", landmarkAbout: "Where evidence of the world's actual creation is preserved.",
    palette: { sky: "#efedf5", far: "#d5d0e4", near: "#b3abcd", ground: "#17122a" } },
];

export interface Faction { id: string; name: string; about: string; publicAim: string; hiddenAim: string; good: string; ill: string }
/** The five factions. None is entirely good or evil: the player should have reasons to support and oppose each. */
export const FACTIONS: Faction[] = [
  { id: "crown", name: "The Crown", about: "The royal houses controlling the Crownlands, through military alliances, taxation, magical monopolies and political marriages.",
    publicAim: "Preserve civilization.", hiddenAim: "Maintain control over the remaining magical resources.", good: "Provides food and infrastructure.", ill: "Exploits the poor." },
  { id: "church", name: "The Ashen Church", about: "The dominant religious institution. It teaches that magic is a divine burden and that uncontrolled use is a sin.",
    publicAim: "Protect humanity from magical corruption.", hiddenAim: "Preserve the Church's exclusive access to several ancient relics.", good: "Protects people from dangerous magic.", ill: "Suppresses knowledge." },
  { id: "meridian", name: "The Meridian", about: "A clandestine network of scholars, artificers and magical engineers.",
    publicAim: "Understand the decline of magic.", hiddenAim: "Develop artificial essences that can replace the Firstborn.", good: "Has made genuine scientific progress.", ill: "Treats people as experimental material." },
  { id: "nineBells", name: "The Nine Bells", about: "An ancient martial order in the Pale North.",
    publicAim: "Preserve the original traditions of Blade Sorcery.", hiddenAim: "Keep the truth of the Great Binding buried, even if that means killing their own students.", good: "Preserves knowledge.", ill: "Commits atrocities to maintain secrecy." },
  { id: "unbound", name: "The Unbound", about: "A loose coalition of smugglers, mercenaries, refugees, rogue sorcerers and outlaw settlements.",
    publicAim: "Freedom from the institutions that control magic.", hiddenAim: "None collectively. Different leaders have wildly different ambitions.", good: "Liberates people.", ill: "Sometimes become criminal warlords themselves." },
];

/** The five Firstborn. Names and domains are provisional canon candidates. */
export const FIRSTBORN = [
  { name: "Avar", domain: "Form", influence: "Matter, shape, physical existence" },
  { name: "Nhal", domain: "Memory", influence: "Identity, recollection, the past" },
  { name: "Veyr", domain: "Passage", influence: "Distance, movement, boundaries" },
  { name: "Oruun", domain: "Vitality", influence: "Life, death, biological existence" },
  { name: "Syth", domain: "Binding", influence: "Contracts, causality, relationships" },
];

/** The Taking: power cannot be created, only transferred, extracted, divided or transformed. */
export const TAKING = {
  methods: [
    { name: "Blood", process: "Extracting magical inheritance from a living being", cost: "Physical mutations, shortened lifespan" },
    { name: "Relics", process: "Binding ancient objects to a weapon or body", cost: "Dependency, possession" },
    { name: "Contracts", process: "Bargaining with supernatural entities", cost: "Debt, loss of memories or freedom" },
    { name: "Slaying", process: "Killing a magical creature and claiming its essence", cost: "Psychological or physical corruption" },
    { name: "Sacrifice", process: "Surrendering something permanently", cost: "Irreversible personal loss" },
  ],
  laws: [
    { name: "Conservation", law: "Every magical effect consumes or transfers something. There is no free power." },
    { name: "Compatibility", law: "Not every essence can be bound to every person. Incompatible essences can destroy their wielder." },
    { name: "Resistance", law: "Every acquired power has a will, instinct or nature, and resists certain uses." },
    { name: "Permanence", law: "A true Taking leaves a permanent mark. There is no complete reset of a character's magical history." },
    { name: "Escalation", law: "Greater power demands greater sacrifice or control. A stronger ability is never an unconditional upgrade." },
    { name: "Inheritance", law: "When a Blade Sorcerer dies, the bound essence may remain in the weapon, pass to another, or become an unstable creature." },
  ],
  mastery: ["Binding", "Communion", "Manifestation"],
};

export interface Person { name: string; role: string; about: string }
export interface Chapter { title: string; event: string }
export interface Protagonist {
  id: Hero;
  /** The working title. Personal names are undecided. */
  title: string; campaign: string; archetype: string; age: number;
  /** The fighter of the roster that plays this protagonist (data.ts, CHARS). The pairing is provisional. */
  fighter: number;
  start: RegionId; regions: RegionId[];
  weapon: string; magic: string; gameplay: string; traversal: string;
  background: string; traits: string[];
  allies: Person[]; antagonist: Person; bossMechanic: string;
  arc: string; finalChoice: string[];
  chapters: Chapter[];
}

const chapters = (rows: [string, string][]): Chapter[] => rows.map(([title, event]) => ({ title, event }));

export const PROTAGONISTS: Protagonist[] = [
  { id: "forbidden", title: "The Forbidden", campaign: "The Stolen God", archetype: "The disgraced executioner", age: 31, fighter: 0,
    start: "crownlands", regions: ["crownlands", "hollowBelow"],
    weapon: "A massive executioner's greatsword", magic: "Ancient runic manipulation",
    gameplay: "Heavy sword combat, counters, deliberate attacks, magical disruption", traversal: "Heavy jumps, wall-breaking, grappling onto structures",
    background: "For fourteen years he executed for the Crown those whose magic made them too dangerous to imprison, and was famous for killing sorcerers without letting their essences escape. At Blackspire, an elderly prisoner told him the Crown was killing people to harvest their essence, and offered him the power he carried. He took it. The prisoner died. His sword became marked with ancient runes.",
    traits: ["Reserved and observant", "Deeply suspicious of authority", "Carries guilt but refuses to admit it", "A strong sense of duty, even when he no longer knows what deserves it", "Finds it difficult to form relationships"],
    allies: [
      { name: "Mara Voss", role: "The Informant", about: "A former Crown intelligence officer who helped identify magical prisoners. She knows his history and has her own reasons for betraying the Crown." },
      { name: "Brother Cael", role: "The Confessor", about: "A religious investigator who once considered him a friend, and now hunts him, believing the stolen essence will destroy the world." },
      { name: "The Prisoner", role: "The First Voice", about: "The dying man whose essence was taken. His memories occasionally appear within the sword." },
    ],
    antagonist: { name: "Lord Commander Veylan", role: "The Crown's chief magical executioner", about: "He trained the protagonist and believes individual freedom is a small price for civilization's survival. He does not hate his former student. He considers him a dangerous failure who must be put down." },
    bossMechanic: "Anti-magic chains and heavy sword techniques. Punishes careless magic use and counters repeated attacks.",
    arc: "He begins believing that following orders is the same as doing what is right. He ends having to decide whether responsibility for his past gives him the right to decide for everyone else.",
    finalChoice: ["Destroy the sword", "Preserve the First Voice", "Accept its complete manifestation"],
    chapters: chapters([
      ["The Last Sentence", "Execution at Blackspire and the Taking"], ["The Marked Man", "Escape from Crown pursuit"],
      ["The Price of Mercy", "Discovers the prisoner network"], ["The Black Archive", "Learns how the Crown harvests essences"],
      ["The Silent Procession", "Encounters the Ember during a military evacuation"], ["The Man in the Blade", "Discovers the prisoner is communicating with him"],
      ["The Forgotten Vault", "Finds evidence of the Great Binding"], ["The Master's Hand", "Fights Lord Commander Veylan"],
      ["The First Voice", "Discovers why the prisoner wanted to die"], ["The Forbidden Door", "Reaches the first ancient seal"],
    ]) },
  { id: "ember", title: "The Ember", campaign: "The Saint of Ash", archetype: "The revolutionary who became the symbol of the people she once hated", age: 26, fighter: 1,
    start: "ashenReach", regions: ["ashenReach", "crownlands"],
    weapon: "A gigantic furnace-forged greatsword", magic: "Combustion, flame manipulation, explosive energy",
    gameplay: "Heavy aggression, powerful combos, environmental destruction, high-risk attacks", traversal: "Destructive movement, explosive jumps, burning obstacles",
    background: "Born in Cinderfall, where the Crown mined rare magical minerals and counted its people as labour. When she was seventeen a military order destroyed the settlement and her family died. She survived by a contract with an ancient creature under the volcanic earth, and its price was her memories of the people she loved. She remembers the massacre and the soldiers' faces, but not her family's. The Crown that destroyed her home now celebrates her as a symbol of unity.",
    traits: ["Fiercely independent", "Charismatic and occasionally funny", "Enjoys fighting more than she should", "Impulsive, but not stupid", "Distrusts anyone who wants to make her a symbol"],
    allies: [
      { name: "Rook", role: "The Former Mine Captain", about: "An older survivor of Cinderfall who remembers her family and tries to help her recover the truth." },
      { name: "Sera", role: "The Revolutionary", about: "A young political organizer who believes the Ember should lead an uprising." },
      { name: "General Halvek", role: "The Celebrated Hero", about: "The commander responsible for the massacre, now publicly regarded as one of the great protectors of the Crown." },
    ],
    antagonist: { name: "The Furnace Below", role: "The entity of her contract", about: "It has fed on the memories of the dead for generations. It does not want to destroy humanity. It wants to become capable of experiencing human life, and believes the Ember is the closest thing it has ever had to a body." },
    bossMechanic: "The arena changes as the creature consumes pieces of the player's memories.",
    arc: "She begins fighting because she has nothing left to lose. She ends realizing that revenge cannot restore what she sacrificed.",
    finalChoice: ["Recover her memories at the cost of her magical power", "Surrender her remaining memories to the Furnace", "Find a way to break the contract"],
    chapters: chapters([
      ["Cinderfall", "The destruction of her settlement"], ["The Bargain", "The contract and loss of memories"],
      ["Ashes and Iron", "Her first revolutionary victories"], ["A Saint Is Born", "The Crown turns her into propaganda"],
      ["The Silent Procession", "Meets the Forbidden"], ["The Red Campaign", "Leads an uprising against a military fortress"],
      ["The Family Grave", "Finds the records of her family's final moments"], ["The General's Daughter", "Discovers an unexpected connection to Halvek's household"],
      ["The Furnace Below", "Confronts the entity"], ["The Last Memory", "Chooses what she is willing to remember"],
    ]) },
  { id: "exile", title: "The Exile", campaign: "The Nine Bells", archetype: "The gifted student who discovers his entire education was a lie", age: 23, fighter: 3,
    start: "paleNorth", regions: ["paleNorth", "hollowBelow"],
    weapon: "Two ancient swords, one short and one long", magic: "Lightning and spatial manipulation",
    gameplay: "Fast movement, aerial combat, dual-wielding, teleportation, chained attacks", traversal: "Wall-running, dashes, air movement, precision platforming",
    background: "Raised at the Monastery of Nine Bells, which taught that mastery needs complete discipline over the self: no emotion, attachment or identity. One of its most talented students, he was given the two relic swords of the order's founders. At his final examination he found the monastery experimenting on its students; those who failed the binding were buried beneath it. He tried to expose it, was accused of murder, and escaped with the swords.",
    traits: ["Competitive", "Proud", "Extremely disciplined", "Struggles with emotional intimacy", "Wants recognition more than he admits"],
    allies: [
      { name: "Master Ilyen", role: "The Old Instructor", about: "His former teacher, who genuinely loves him but believes the monastery's actions were necessary." },
      { name: "Niko", role: "The Runaway Student", about: "A younger student who escaped the monastery and becomes the Exile's responsibility." },
      { name: "Eshara", role: "The Northern Guide", about: "A smuggler who knows the secret routes through the Pale North and has a personal history with the Nine Bells." },
    ],
    antagonist: { name: "The Bellkeeper", role: "Leader of the Nine Bells", about: "He believes the monastery is the only institution capable of preventing another magical apocalypse. He knows the Great Binding is failing and has been sacrificing students to preserve its stability." },
    bossMechanic: "A legendary swordsman who reads the opponent. Learns repeated player combos and changes his counterattack pattern.",
    arc: "He begins believing his worth comes from being the best. He ends discovering the monastery never wanted a great warrior. It wanted a vessel.",
    finalChoice: ["Destroy the monastery's traditions", "Reform the order", "Take control and continue its work under different principles"],
    chapters: chapters([
      ["Nine Bells", "The monastery and the Exile's escape"], ["The Two Swords", "Discovers the relics' hidden abilities"],
      ["The Northern Road", "Meets Niko and Eshara"], ["The Frozen Dead", "Encounters a battlefield preserved by magic"],
      ["The Empty Monastery", "Returns to find the monastery preparing another experiment"], ["The Names Beneath", "Finds the records of sacrificed students"],
      ["The Bellkeeper's Truth", "Learns why the order was founded"], ["The First Passage", "Discovers the connection to the Firstborn Veyr"],
      ["The Last Lesson", "Fights Master Ilyen"], ["The Ninth Bell", "Chooses the future of the order"],
    ]) },
  { id: "hollow", title: "The Hollow", campaign: "The Dead Remember", archetype: "The healer who returned from death with something else inside her", age: 29, fighter: 4,
    start: "drownedWilds", regions: ["drownedWilds", "crownlands"],
    weapon: "A thin ritual blade that can split into spectral weapons", magic: "Spirit contracts, memory manipulation, spectral manifestation",
    gameplay: "Summoning, deception, ranged magical attacks, possession, tactical combat", traversal: "Spectral platforms, temporary possession, spirit traversal",
    background: "A travelling healer among settlements devastated by magical warfare, treating the people the powerful called expendable. She died in an epidemic in the Drowned Wilds trying to save a group of children. Beyond death she met the Witness, which offered a contract: return, and collect the final memories of those who die near her. She came back able to summon the dead and use their weapons. The dead are not obedient tools. Some want revenge, some want to go home, some do not remember they are dead.",
    traits: ["Compassionate", "Observant", "Patient", "Sometimes disturbingly detached", "An unusual sense of humour about death"],
    allies: [
      { name: "Tomas", role: "The Living Brother", about: "A former travelling companion who believes she died years ago." },
      { name: "The Child Without a Face", role: "The ghost that follows", about: "It gradually reveals fragments of the Witness's true nature." },
      { name: "Old Mother Vey", role: "The Gravekeeper", about: "She has kept the burial grounds for decades and knows the secret of the Drowned Wilds." },
    ],
    antagonist: { name: "The Witness", role: "The entity between memory and death", about: "It does not understand human morality. It collects memories because it believes they are the only things that give existence meaning, and wants a permanent archive of every human life." },
    bossMechanic: "Summons previous enemies and temporarily changes the arena into memories from their lives.",
    arc: "She begins believing death is another condition to be treated. She ends understanding that some things cannot be saved, and that forcing people to remain is not the same as loving them.",
    finalChoice: ["Release the dead", "Preserve the archive", "Take the Witness's place"],
    chapters: chapters([
      ["The Last Patient", "Her death and resurrection"], ["The Witness", "Learns the contract"],
      ["A Thousand Names", "First encounters with summoned spirits"], ["The Weeping City", "Discovers that the dead are behaving strangely"],
      ["The Living Brother", "Reunites with Tomas"], ["The Memory Market", "Discovers people selling memories to survive"],
      ["The Forgotten Army", "Encounters spirits of a lost military expedition"], ["The Night of Falling Stars", "Experiences the mass return of the dead"],
      ["The Witness's Archive", "Discovers what the entity has been collecting"], ["The Last Goodbye", "Decides the fate of the dead"],
    ]) },
  { id: "architect", title: "The Architect", campaign: "The Manufactured God", archetype: "The political strategist who wants to make humanity independent of the supernatural", age: 35, fighter: 2,
    start: "crownlands", regions: ["crownlands", "hollowBelow"],
    weapon: "Multiple floating enchanted blades", magic: "Bloodline manipulation, artificial relics, essence binding",
    gameplay: "Tactical control, summoned weapons, traps, battlefield manipulation, complex magic combinations", traversal: "Floating weapons, magical constructs, controlled levitation",
    background: "Born outside the royal line to a king and a Meridian scholar, never meant to inherit, raised as a political liability between noble households and secret institutions. He found the Meridian's research into artificial essences and concluded that dependence on ancient beings is why civilization is failing. He escaped and built a network of nobles, merchants, mercenaries and researchers. His ambition is to manufacture a new source of power: a god made by humanity, for humanity.",
    traits: ["Charming", "Extremely intelligent", "Patient", "Manipulative", "Rarely raises his voice", "Genuine affection for a small number of people"],
    allies: [
      { name: "Lady Elira", role: "The Royal Sister", about: "His legitimate half-sister. She wants to preserve the monarchy but believes her brother may be the only person capable of saving it." },
      { name: "Dr. Maelin", role: "The Meridian Scientist", about: "His former mentor, who taught him artificial essence binding." },
      { name: "Kerrick", role: "The Mercenary Commander", about: "A loyal commander who believes in the vision but has no interest in its philosophy." },
    ],
    antagonist: { name: "The Crownless King", role: "The being he made", about: "A new intelligence composed of fragments of magical entities and human memories. It begins with no identity and develops one. It does not want to serve its creator. It wants to understand why it was created." },
    bossMechanic: "Adapts to the player's selected powers and can temporarily replicate their abilities.",
    arc: "He begins believing the world can be saved if the right person is allowed to control it. He ends discovering his artificial god believes its creator has no right to decide on its behalf.",
    finalChoice: ["Destroy his creation", "Surrender control", "Bind it to himself permanently"],
    chapters: chapters([
      ["The Bastard Prince", "His childhood and escape from royal custody"], ["The Meridian", "Discovers artificial essence binding"],
      ["A Necessary Monster", "Begins recruiting nobles and mercenaries"], ["The Burning of Blackspire", "Secretly engineers a political crisis"],
      ["The Five Objects", "Receives information about the falling stars"], ["The Manufactured Blade", "Creates his first artificial sorcerer"],
      ["The Crownless King", "His experiment develops independent consciousness"], ["The Betrayal", "His inner circle fractures"],
      ["The Hollow Below", "Discovers the actual purpose of the Firstborn"], ["The Architect's Choice", "Decides what humanity should become"],
    ]) },
];

/** The saga's five measures of the world, in the order `shift` numbers them. */
export const MEASURES = [
  { key: "crown", name: "Crown influence", about: "Strength of royal authority" },
  { key: "church", name: "Church influence", about: "Strength of religious control" },
  { key: "unbound", name: "Unbound influence", about: "Power of independent factions" },
  { key: "stability", name: "Magical stability", about: "Health of the Great Binding" },
  { key: "awakening", name: "Firstborn awakening", about: "Degree of supernatural return" },
] as const;
export type Measure = (typeof MEASURES)[number]["key"];

/**
 * What can be learned, numbered as the saga's facts. The first five are the mystery ladder, in the order the story
 * means them to be revealed; the rest are what the crossover events reveal.
 */
export const FACTS = [
  { id: "bindingFails", truth: "Magic is disappearing because the Great Binding is failing." },
  { id: "firstbornHarvested", truth: "Humanity made the ancient weapons by harvesting the Firstborn." },
  { id: "memoryUnravels", truth: "The dead return because memory and identity are destabilizing." },
  { id: "artificialMind", truth: "What the Architect is creating is an independent intelligence." },
  { id: "historyIncomplete", truth: "Humanity's version of the First War is incomplete: the Firstborn kept a peaceful world with no free will." },
  { id: "crownHarvests", truth: "The Crown kills people to harvest their magical essence." },
  { id: "prisonersBeneathBlackspire", truth: "The Crown holds magical prisoners beneath Blackspire." },
  { id: "architectLitBlackspire", truth: "The Architect financed the crisis that burned Blackspire. The destruction was not his plan." },
  { id: "sealBeneathBlackspire", truth: "An ancient structure and a Firstborn fragment lie beneath Blackspire." },
  { id: "cinderfallSubjects", truth: "Survivors of Cinderfall were used by the Crown as experimental subjects." },
  { id: "monasteryExpectedStars", truth: "The Nine Bells expected the Night of Falling Stars." },
  { id: "studentsSacrificed", truth: "The Bellkeeper sacrifices students to steady the Great Binding." },
  { id: "firstWarUnwon", truth: "Humanity did not win the First War. It survived long enough to seal the battlefield." },
  { id: "firstVoiceMemory", truth: "The executed prisoner was passing on a memory of the Great Binding, which the Forbidden's sword now holds." },
  { id: "kingHasIdentity", truth: "The Crownless King speaks with stolen memories and has developed an identity of its own." },
  { id: "firstbornOneSystem", truth: "The five Firstborn are one system that once governed reality, fractured into five by the Great Binding." },
  { id: "starsAreBindings", truth: "The five falling stars were fragments of the Firstborn's original bindings." },
] as const;
export type FactId = (typeof FACTS)[number]["id"];
/** The number the saga knows a fact by. */
export const factNumber = (id: FactId) => FACTS.findIndex((fact) => fact.id === id);

/** How a protagonist is involved in an event; a protagonist left out is not in it. */
export type Involvement = "Direct" | "Indirect" | "Discovery" | "Aftermath" | "Cause" | "Rumor" | "Research" | "Memory" | "Knowledge";
export interface StoryEvent {
  id: string; name: string;
  /** Years relative to the Night of Falling Stars. */
  years: [number, number];
  place: RegionId;
  /** What actually happened. */
  truth: string;
  /** What each protagonist involved experiences or believes, which may not be the truth. */
  perspectives: Partial<Record<Hero, { how: Involvement; sees: string }>>;
  /** What the event does to the world: a measure and how far it moves. */
  effects: Partial<Record<Measure, number>>;
  reveals: FactId[];
}

/** The crossover events: the shared record the five campaigns are written against. */
export const EVENTS: StoryEvent[] = [
  { id: "blackspireBurning", name: "The Burning of Blackspire", years: [-1, 1], place: "crownlands",
    truth: "The Architect's political operation destabilizes the city while a separate Crown experiment ruptures the relic beneath it. The city burns and thousands die.",
    perspectives: {
      forbidden: { how: "Direct", sees: "Evidence of the Crown's magical prisoners beneath the city." },
      ember: { how: "Indirect", sees: "The evacuation. She believes the Crown destroyed the city deliberately." },
      exile: { how: "Discovery", sees: "The monastery's old records referencing the structure underneath." },
      hollow: { how: "Aftermath", sees: "The spirits of the people killed in the fire." },
      architect: { how: "Cause", sees: "The consequences of a plan that escaped his control." },
    },
    effects: { crown: -15, unbound: 10, stability: -10 },
    reveals: ["prisonersBeneathBlackspire", "architectLitBlackspire", "sealBeneathBlackspire"] },
  { id: "fallingStars", name: "The Night of Falling Stars", years: [0, 0], place: "crownlands",
    truth: "Five fragments of the Firstborn's original bindings fall across Vareth, one in each region. They are evidence that the Great Binding is failing, not keys to one door.",
    perspectives: {
      forbidden: { how: "Direct", sees: "A dying stranger carrying one of the fragments." },
      ember: { how: "Direct", sees: "An order to retrieve a fragment from a military outpost." },
      exile: { how: "Direct", sees: "That the monastery has been expecting the event." },
      hollow: { how: "Direct", sees: "Thousands of the dead suddenly returning." },
      architect: { how: "Knowledge", sees: "Reports of all five events before their public discovery." },
    },
    effects: { stability: -10, awakening: 10 },
    reveals: ["starsAreBindings", "monasteryExpectedStars", "memoryUnravels"] },
  { id: "silentProcession", name: "The Silent Procession", years: [0, 0], place: "ashenReach",
    truth: "A military convoy carries prisoners stripped of their magical essences through the Ashen Reach. Among them are survivors of Cinderfall.",
    perspectives: {
      forbidden: { how: "Direct", sees: "The convoy itself." },
      ember: { how: "Direct", sees: "Its remains, and that Cinderfall's survivors were experimental subjects." },
      exile: { how: "Rumor", sees: "Talk of it on the road." },
      hollow: { how: "Discovery", sees: "What the convoy left behind." },
      architect: { how: "Indirect", sees: "Its effect on his network." },
    },
    effects: { crown: -5, unbound: 5 },
    reveals: ["crownHarvests", "cinderfallSubjects"] },
  { id: "emptyMonastery", name: "The Empty Monastery", years: [0, 1], place: "paleNorth",
    truth: "The Nine Bells evacuate because the Bellkeeper knows the seals are failing, while the Architect's researchers try to steal the monastery's relic records.",
    perspectives: {
      forbidden: { how: "Rumor", sees: "Word that the order has left its mountain." },
      exile: { how: "Direct", sees: "The evacuation, and traces of an organization he takes for another Crown conspiracy." },
      architect: { how: "Indirect", sees: "His researchers' reports." },
    },
    effects: { stability: -5 },
    reveals: ["studentsSacrificed"] },
  { id: "armyNeverBuried", name: "The Army That Was Never Buried", years: [1, 1], place: "drownedWilds",
    truth: "The dead soldiers of the force that fought the Firstborn still stand. Their memories suggest humanity never won the First War.",
    perspectives: {
      forbidden: { how: "Discovery", sees: "Signs of the army." },
      exile: { how: "Discovery", sees: "Its place in the order's records." },
      hollow: { how: "Direct", sees: "The army, and what it remembers." },
      architect: { how: "Research", sees: "Accounts gathered by his scholars." },
    },
    effects: { awakening: 10 },
    reveals: ["firstWarUnwon", "firstbornHarvested"] },
  { id: "firstVoice", name: "The First Voice", years: [1, 1], place: "hollowBelow",
    truth: "The prisoner the Forbidden executed was not escaping death. He was transferring an ancient memory to someone able to understand it.",
    perspectives: {
      forbidden: { how: "Direct", sees: "That his sword holds part of the memory of the Great Binding." },
      exile: { how: "Indirect", sees: "Its echo in the founders' swords." },
      hollow: { how: "Memory", sees: "The prisoner, among the dead." },
      architect: { how: "Knowledge", sees: "That such a memory exists." },
    },
    effects: { stability: -5 },
    reveals: ["firstVoiceMemory", "bindingFails"] },
  { id: "manufacturedGod", name: "The Manufactured God", years: [2, 2], place: "hollowBelow",
    truth: "The Architect's creation begins speaking to the other protagonists through memories of the dead, relic fragments and the knowledge of the Firstborn. It has an identity of its own.",
    perspectives: {
      forbidden: { how: "Indirect", sees: "A voice like the man he executed." },
      ember: { how: "Indirect", sees: "A voice like her lost family." },
      exile: { how: "Indirect", sees: "A voice like the founders of his monastery." },
      hollow: { how: "Direct", sees: "A voice like the dead, and that it is not one of them." },
      architect: { how: "Direct", sees: "His creation speaking through stolen memories. He does not yet see it has become someone." },
    },
    effects: { awakening: 15 },
    reveals: ["artificialMind", "kingHasIdentity"] },
  { id: "convergence", name: "The Fivefold Convergence", years: [2, 3], place: "hollowBelow",
    truth: "The five reach the Hollow Below with goals that cannot all be met. The Firstborn are one system, and each of the five holds a power that answers to part of it. They are not destined to be vessels.",
    perspectives: {
      forbidden: { how: "Direct", sees: "A chance to understand the First Voice." },
      ember: { how: "Direct", sees: "A chance to end the system that destroyed her home." },
      exile: { how: "Direct", sees: "A chance to keep the ancient powers from returning." },
      hollow: { how: "Direct", sees: "The decision about what happens to the dead." },
      architect: { how: "Direct", sees: "The completion of his artificial god." },
    },
    effects: { stability: -20, awakening: 20 },
    reveals: ["firstbornOneSystem", "historyIncomplete"] },
];

/** The timeline, in years relative to the Night of Falling Stars. The exact chronology is provisional. */
export const TIMELINE: [number, string][] = [
  [-15, "The Architect is born into the royal family."], [-12, "The Ember's family begins working in Cinderfall's mines."],
  [-10, "The Exile enters the Nine Bells monastery."], [-9, "The Hollow begins travelling as a healer."],
  [-8, "The Forbidden becomes a Crown executioner."], [-6, "The Meridian discovers evidence of artificial essence binding."],
  [-5, "The destruction of Cinderfall. The Ember makes her contract."], [-4, "The Hollow dies and returns through the Witness."],
  [-3, "The Exile discovers the monastery experiments."], [-2, "The Architect escapes the Meridian and begins building his network."],
  [-1, "The Forbidden executes the mysterious prisoner network."], [0, "The Night of Falling Stars. The five campaigns begin converging."],
  [1, "The Great Binding begins to collapse."], [2, "The five protagonists reach the Hollow Below."], [3, "The final confrontation and resolution."],
];

export const ENDINGS = [
  { id: "brokenCrown", name: "The Broken Crown", word: "Freedom", about: "The Great Binding is destroyed. The Firstborn are freed but diminished. Magic reaches ordinary people, the world loses much of its supernatural infrastructure, and the kingdoms collapse or transform.", theme: "Freedom requires accepting an imperfect future." },
  { id: "perfectWorld", name: "The Perfect World", word: "Order", about: "The Firstborn are restored. War, hunger and magical instability begin to disappear, at the price of individual freedom.", theme: "A perfect world may not be worth living in." },
  { id: "crownlessAge", name: "The Crownless Age", word: "Transformation", about: "The Architect's creation replaces the Firstborn and becomes the foundation of a new civilization. Its creators cannot guarantee what it will become.", theme: "Humanity cannot create something powerful enough to save it without also creating something capable of destroying it." },
  { id: "unwrittenWorld", name: "The Unwritten World", word: "Hidden", about: "The five dismantle the system itself. Magic becomes unpredictable and decentralized. Nobody controls it, nobody owns it, and the future is unknown. It needs the complete history of the Great Binding, the key personal conflicts of all five campaigns resolved, certain people preserved, a sacrifice from each protagonist, and the factions refused.", theme: "The only ending in which nobody decides what the world becomes for everyone else." },
];

/** Optional regional bosses. Some are met differently depending on the protagonist. */
export const HUNTS = [
  { name: "The Red Widow", place: "crownlands" as RegionId, about: "Former royal assassin." },
  { name: "The Ash Giant", place: "ashenReach" as RegionId, about: "Ancient creature whose essence is used in industrial furnaces." },
  { name: "The Frozen Saint", place: "paleNorth" as RegionId, about: "Failed Nine Bells experiment." },
  { name: "The Drowned King", place: "drownedWilds" as RegionId, about: "Ancient ruler preserved by the Witness. An enemy to the Forbidden; someone the Hollow can speak with." },
  { name: "The Nameless Smith", place: "hollowBelow" as RegionId, about: "Creator of the first essence-binding swords." },
];
