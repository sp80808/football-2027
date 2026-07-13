/**
 * Deterministic name generation for fictional football players and clubs.
 * Uses Mulberry32 PRNG seeded from a string for full reproducibility.
 */

// ── PRNG ────────────────────────────────────────────────────────────────────

export function mulberry32(seed: number) {
  return function (): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export type RNG = () => number;

export function pickRandom<T>(arr: T[], rng: RNG): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickWeighted<T>(items: T[], weights: number[], rng: RNG): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ── Name pools (fictional but culturally varied) ─────────────────────────

const FIRST_ENGLISH  = ['Tom','Jack','George','Dan','Harry','Will','Rob','Ben','Sam','Andy','Lee','Chris','James','Ryan','Connor','Liam','Joel','Kyle','Reece','Aaron'];
const FIRST_IRISH    = ['Conor','Padraig','Ciarán','Seamus','Colm','Fergal','Niall','Kieran','Declan'];
const FIRST_SCOTTISH = ['Callum','Robbie','Scott','Craig','Ross','Alan','Fraser','Gregor','Rory'];
const FIRST_AFRICAN  = ['Kwame','Kofi','Emmanuel','Ibrahim','Mamadou','Oumar','Abdou','Cheick','Sadio','Franck'];
const FIRST_EASTERN  = ['Dmitri','Pavel','Andrei','Bogdan','Radoslav','Miroslav','Lukáš','Tomáš','Mateusz'];
const FIRST_LATIN    = ['Carlos','Miguel','Roberto','Juan','Marco','Eduardo','Lucas','Rodrigo','Mateus'];
const FIRST_NORDIC   = ['Erik','Lars','Johan','Anders','Stig','Bjorn','Mikael','Rasmus','Lasse'];

const LAST_ENGLISH   = ['Smith','Jones','Brown','Taylor','Wilson','Davies','Evans','White','Hall','Clark','Martin','Thompson','Wright','Walker','Robinson','Turner','Wood','Hughes','Green','Adams'];
const LAST_IRISH     = ['Murphy','O\'Brien','Walsh','Ryan','O\'Sullivan','McCarthy','Brennan','Doyle','Connolly'];
const LAST_SCOTTISH  = ['Campbell','MacPherson','Fraser','Robertson','Reid','Murray','Mackay','Henderson'];
const LAST_AFRICAN   = ['Osei','Asante','Diallo','Koné','Traoré','Mensah','Owusu','Coulibaly','Camara','Dembélé'];
const LAST_EASTERN   = ['Petrov','Volkov','Novak','Horák','Kowalski','Nowak','Marek','Beneš'];
const LAST_LATIN     = ['Santos','Ferreira','Oliveira','Costa','Silva','García','López','Martínez','Rodríguez'];
const LAST_NORDIC    = ['Svensson','Lindqvist','Eriksson','Andersen','Hansen','Johansen','Pedersen','Nielsen'];

export type Heritage = 'english' | 'irish' | 'scottish' | 'african' | 'eastern_eu' | 'latin' | 'nordic';

const HERITAGE_FIRST: Record<Heritage, string[]> = {
  english:    FIRST_ENGLISH,
  irish:      FIRST_IRISH,
  scottish:   FIRST_SCOTTISH,
  african:    FIRST_AFRICAN,
  eastern_eu: FIRST_EASTERN,
  latin:      FIRST_LATIN,
  nordic:     FIRST_NORDIC,
};

const HERITAGE_LAST: Record<Heritage, string[]> = {
  english:    LAST_ENGLISH,
  irish:      LAST_IRISH,
  scottish:   LAST_SCOTTISH,
  african:    LAST_AFRICAN,
  eastern_eu: LAST_EASTERN,
  latin:      LAST_LATIN,
  nordic:     LAST_NORDIC,
};

const HERITAGE_NATIONALITY: Record<Heritage, string> = {
  english:    '🏴󠁧󠁢󠁥󠁮󠁧󠁿 English',
  irish:      '🇮🇪 Irish',
  scottish:   '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish',
  african:    '🌍 African',
  eastern_eu: '🇪🇺 E.European',
  latin:      '🌎 Latin Am.',
  nordic:     '🇸🇪 Nordic',
};

/** Heritage weights by tier: lower tiers are predominantly British */
function heritageWeights(tier: number): number[] {
  // [english, irish, scottish, african, eastern_eu, latin, nordic]
  const british = Math.max(20, 70 - (10 - tier) * 5);
  const overseas = (100 - british) / 4;
  return [british, 5, 5, overseas, overseas, overseas, overseas];
}

export function generatePlayerName(tier: number, rng: RNG): { name: string; nationality: string } {
  const heritages: Heritage[] = ['english','irish','scottish','african','eastern_eu','latin','nordic'];
  const weights = heritageWeights(tier);
  const heritage = pickWeighted(heritages, weights, rng);
  const first = pickRandom(HERITAGE_FIRST[heritage], rng);
  const last  = pickRandom(HERITAGE_LAST[heritage],  rng);
  return { name: `${first} ${last}`, nationality: HERITAGE_NATIONALITY[heritage] };
}

// ── Club names ───────────────────────────────────────────────────────────

const TOWN_PREFIXES = ['North','South','East','West','Old','New','Upper','Lower','Great','Little','Castle','Bridge','Stone','Wood','Black','Red','White','Green'];
const TOWN_ROOTS    = ['field','ton','ford','wick','dale','gate','worth','wood','well','bury','ham','pool','chester','minster','leigh','thorpe','bridge','combe','shaw','more'];
const CLUB_SUFFIXES = ['FC','United','City','Town','Athletic','Rovers','Wanderers','AFC','Rangers','Albion','Vale'];

export function generateClubName(seed: string): { name: string; shortName: string; crestEmoji: string } {
  const rng = mulberry32(seedFromString(seed));
  const usePrefix = rng() > 0.4;
  const town = usePrefix
    ? `${pickRandom(TOWN_PREFIXES, rng)}${pickRandom(TOWN_ROOTS, rng)}`
    : `${pickRandom(['Ash','Bram','Croft','Dale','Edge','Fell','Glen','Helm','Iron','Kirk'], rng)}${pickRandom(TOWN_ROOTS, rng)}`;
  const suffix = pickRandom(CLUB_SUFFIXES, rng);
  const name = `${town} ${suffix}`;
  const shortName = town.length > 8 ? town.slice(0, 3).toUpperCase() : town.toUpperCase().slice(0, 4);
  const CRESTS = ['⚽','🏟️','🦁','🦅','🐉','⚡','🔵','🔴','🟡','🟢','🛡️','⚔️','🌊','🔥','🌟'];
  const crestEmoji = pickRandom(CRESTS, rng);
  return { name, shortName, crestEmoji };
}
