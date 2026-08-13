"use client";

import { supabase } from "@/lib/supabase";

export type PlayerSportsProfile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  is_active: boolean;
};

const PLAYER_PROFILE_FIELDS =
  "id,full_name,display_name,shirt_number,position,photo_url,is_active";

export async function loadMyPlayerSportsProfile(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_PROFILE_FIELDS)
    .eq("id", playerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PlayerSportsProfile | null) ?? null;
}

export function getPlayerDisplayName(profile: PlayerSportsProfile | null, fallback: string) {
  return (
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    fallback
  );
}
