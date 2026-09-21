import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

export type User = {
  user_id: number;
  username: string | null;
  first_name: string | null;
  photo_url: string | null;
  standoff_id: string | null;
  balance: number;
  nickname: string | null;
  last_nick_change: string | null;
  bg_color: string | null;
  nickname_color: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  avatar_frame: string | null;
  nickname_icon: string | null;
  clan_id: number | null;
  points: number | null;
  trust_score: number | null;
  role: string | null;
  wins: number | null;
  losses: number | null;
  kills: number | null;
  deaths: number | null;
  matches_played: number | null;
  banned: boolean | null;
  ban_reason: string | null;
  favorite_map: string | null;
  rank: string | null;
  rank_stars: number | null;
  custom_badge: string | null;
  custom_badge_approved: boolean | null;
  hide_profile: boolean | null;
  theme: string | null;
  tokens: number | null;
  last_token_refill: string | null;
  has_premium: boolean | null;
  custom_banner_url: string | null;
  last_seen: string | null;
  created_at?: string;
};

export type Tournament = {
  id: number;
  name: string;
  sponsor_channel: string | null;
  max_teams: number;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
  organizer_id: number | null;
  prize_gold: number | null;
  rules: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type Team = {
  id: number;
  tournament_id: number;
  player1_id: number;
  player2_id: number | null;
  player3_id: number | null;
  player4_id: number | null;
  player5_id: number | null;
  side: 'left' | 'right' | null;
  confirmed1: boolean;
  confirmed2: boolean;
  clan_id: number | null;
  clan_name: string | null;
  clan_tag: string | null;
  clan_logo_url: string | null;
  team_name: string | null;
  logo_url: string | null;
  captain_id: number | null;
  rules_accepted: boolean | null;
  rules_accepted_at: string | null;
};

export type Match = {
  id: number;
  tournament_id: number;
  team1_id: number | null;
  team2_id: number | null;
  map: string | null;
  score: string | null;
  status: 'pending' | 'live' | 'done';
  winner_id: number | null;
  score_ct: number | null;
  score_t: number | null;
  photo_url: string | null;
  finished_at: string | null;
  channel_posted: boolean | null;
};