/** Datenbanktypen (von Hand gepflegt, entsprechen supabase/migrations). */
import type { PhaseRow, SizeClass } from '@shared/phase.ts';
import type { Traits } from '@shared/temperament.ts';

export type Sex = 'male' | 'female';
export type Origin = 'breeder' | 'shelter' | 'foreign_rescue' | 'unknown';
export type Environment = {
  area?: 'city' | 'suburb' | 'country';
  garden?: boolean;
  children?: boolean;
  other_animals?: boolean;
};

export type Breed = {
  id: string;
  name_de: string;
  size_class: SizeClass;
  group: string;
  base_traits: Record<string, number>;
  notes: string | null;
};

export type Dog = {
  id: string;
  owner_id: string;
  name: string;
  photo_url: string | null;
  breed_primary_id: string | null;
  breed_secondary_id: string | null;
  is_mixed: boolean;
  sex: Sex | null;
  neutered: boolean | null;
  birth_date: string | null;
  birth_date_estimated: boolean;
  weight_kg: number | null;
  origin: Origin | null;
  environment: Environment;
  created_at: string;
};

export type DogInput = Omit<Dog, 'id' | 'owner_id' | 'created_at' | 'photo_url'> & { photo_url?: string | null };

export type Profile = {
  id: string;
  display_name: string | null;
  push_token: string | null;
  notification_time: string;
  timezone: string;
  is_premium: boolean;
  premium_until: string | null;
  is_admin: boolean;
  media_consent_at: string | null;
  analytics_consent: boolean;
};

export type CoachTip = {
  id: string;
  dog_id: string;
  category: string;
  topic_key: string;
  title: string;
  body: string;
  source: 'ai' | 'phase_change' | 'system';
  priority: number;
  created_at: string;
  read_at: string | null;
};

export type MediaStatus = 'queued' | 'analyzing' | 'done' | 'failed';
export type Situation = 'walk' | 'home' | 'visitors' | 'other_dog' | 'car' | 'alone' | 'other';
export type MediaUpload = {
  id: string;
  dog_id: string;
  storage_path: string;
  type: 'photo' | 'video';
  user_question: string | null;
  is_unwanted: boolean | null;
  situation: Situation | null;
  plan_checkin_id: string | null;
  status: MediaStatus;
  error: string | null;
  created_at: string;
};

export type Analysis = {
  id: string;
  media_id: string;
  result_type: 'answer' | 'assessment' | 'vet_referral' | 'trainer_referral' | 'retake';
  assessment: {
    headline?: string;
    likely_cause?: string;
    alternative_hypotheses?: string[];
    confidence?: 'low' | 'medium' | 'high';
    reasoning?: string;
    safety_measures?: string[];
    retake_request?: string | null;
    uncertainties?: string[];
    plan_status?: 'limit_reached' | 'error';
  } | null;
  answer_md: string | null;
  safety_flag: 'none' | 'vet' | 'aggression' | 'unusable';
  confidence: number | null;
  created_at: string;
};

export type TrainingPlan = {
  id: string;
  dog_id: string;
  analysis_id: string | null;
  goal: string;
  summary: string | null;
  status: 'active' | 'completed' | 'cancelled' | 'superseded';
  start_date: string;
  end_date: string;
  version: number;
  created_at: string;
};

export type TaskRating = 'works' | 'partial' | 'not_yet';
export type PlanTask = {
  id: string;
  plan_id: string;
  day_index: number;
  scheduled_at: string;
  title: string;
  steps: { exercise?: string; goal?: string; steps?: string[]; duration_min?: number; typical_mistake?: string };
  success_criteria: string | null;
  done_at: string | null;
  rating: TaskRating | null;
};

export type PlanCheckin = {
  id: string;
  plan_id: string;
  due_at: string;
  instruction: string | null;
  media_id: string | null;
  comparison: { progress?: string; summary?: string; adjustment?: string } | null;
};

export type ForumCategory = 'training' | 'behavior' | 'puppy' | 'nutrition' | 'health' | 'everyday' | 'other';
export type ForumPost = {
  id: string;
  author_id: string | null;
  dog_snapshot: { breed?: string | null; age_weeks?: number | null; phase?: string | null } | null;
  category: ForumCategory;
  title: string;
  body: string;
  image_url: string | null;
  is_ai: boolean;
  status: 'published' | 'hidden' | 'removed';
  like_count: number;
  reply_count: number;
  created_at: string;
};
export type ForumReply = {
  id: string;
  post_id: string;
  author_id: string | null;
  body: string;
  is_ai: boolean;
  is_best: boolean;
  status: string;
  like_count: number;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'reply' | 'user';
  target_id: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
};

export type AppConfigRow = { key: string; value: unknown; description: string; updated_at: string };

export type Usage = {
  is_premium: boolean;
  dogs: number;
  free_max_dogs: number | null;
  media_this_month: number;
  free_media_analyses_per_month: number | null;
  active_plans: number;
  free_training_plans_active: number | null;
};

export type { PhaseRow, Traits };
