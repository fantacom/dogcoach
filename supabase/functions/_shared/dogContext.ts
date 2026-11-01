import { computePhase, type PhaseResult, type PhaseRow, sizeClassFor, type SizeClass } from './logic/phase.ts';
import { localDate } from './logic/time.ts';
import { adminClient } from './supabase.ts';

export type DogContext = {
  dog: Record<string, unknown> & { id: string; name: string; owner_id: string };
  ownerTimezone: string;
  notificationTime: string;
  phase: PhaseResult | null;
  /** Kompakte, menschenlesbare Beschreibung für Prompts (ohne personenbezogene Daten des Halters). */
  profileText: string;
};

const ORIGIN: Record<string, string> = {
  breeder: 'vom Züchter', shelter: 'aus dem Tierschutz', foreign_rescue: 'aus dem Auslandstierschutz', unknown: 'unbekannt',
};

let phaseCache: PhaseRow[] | null = null;
export async function allPhases(): Promise<PhaseRow[]> {
  if (!phaseCache) {
    const { data, error } = await adminClient().from('dev_phases').select('size_class, phase_key, from_weeks, to_weeks, content');
    if (error) throw error;
    phaseCache = (data ?? []) as PhaseRow[];
  }
  return phaseCache;
}

export async function loadDogContext(dogId: string): Promise<DogContext> {
  const admin = adminClient();
  const { data: dog, error } = await admin
    .from('dogs')
    .select('*, primary:breeds!dogs_breed_primary_id_fkey(name_de, size_class, base_traits, notes), secondary:breeds!dogs_breed_secondary_id_fkey(name_de, size_class, base_traits), owner:profiles!dogs_owner_id_fkey(timezone, notification_time), temperament:temperament_profile(traits)')
    .eq('id', dogId)
    .single();
  if (error || !dog) throw error ?? new Error('dog_not_found');
  const primary = dog.primary as { name_de: string; size_class: SizeClass; base_traits: unknown; notes: string } | null;
  const secondary = dog.secondary as { name_de: string; size_class: SizeClass; base_traits: unknown } | null;
  const owner = dog.owner as { timezone: string; notification_time: string } | null;
  const tz = owner?.timezone ?? 'Europe/Berlin';
  const size = sizeClassFor({ breedSizes: [primary?.size_class, secondary?.size_class], weightKg: dog.weight_kg });
  const phase = computePhase({ birthDate: dog.birth_date, sizeClass: size, phases: await allPhases(), today: localDate(new Date(), tz) });
  const breed = dog.is_mixed
    ? `Mischling${primary ? ` (${[primary.name_de, secondary?.name_de].filter(Boolean).join(' × ')})` : ''}`
    : primary?.name_de ?? 'Rasse unbekannt';
  const env = (dog.environment ?? {}) as Record<string, unknown>;
  const temperament = (dog.temperament as { traits: unknown } | null)?.traits;
  const lines = [
    `Name: ${dog.name}`,
    `Rasse: ${breed} (Größenklasse ${size})`,
    `Geschlecht: ${dog.sex === 'male' ? 'Rüde' : dog.sex === 'female' ? 'Hündin' : 'unbekannt'}${dog.neutered == null ? '' : dog.neutered ? ', kastriert' : ', nicht kastriert'}`,
    `Alter: ${phase ? `${Math.floor(phase.ageWeeks / 52)} Jahre ${Math.floor((phase.ageWeeks % 52) / 4.35)} Monate${dog.birth_date_estimated ? ' (geschätzt)' : ''}` : 'unbekannt'}`,
    `Entwicklungsphase: ${phase ? phase.current.content.label : 'unbekannt'}`,
    `Gewicht: ${dog.weight_kg ? `${dog.weight_kg} kg` : 'unbekannt'}`,
    `Herkunft: ${ORIGIN[dog.origin as string] ?? 'unbekannt'}`,
    `Lebensumfeld: ${JSON.stringify(env)}`,
    primary ? `Rassen-Basisprofil (1–5): ${JSON.stringify(primary.base_traits)}; Hinweis: ${primary.notes}` : null,
    temperament ? `Wesensprofil (1–5): ${JSON.stringify(temperament)}` : null,
  ].filter(Boolean);
  return {
    dog: dog as DogContext['dog'],
    ownerTimezone: tz,
    notificationTime: owner?.notification_time ?? '18:00',
    phase,
    profileText: lines.join('\n'),
  };
}
