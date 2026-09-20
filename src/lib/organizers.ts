import { supabase } from '../supabase';

export type Organizer = {
  id: number;
  name: string;
  tag: string | null;
  logo_url: string | null;
  description: string | null;
  owner_id: number | null;
  created_at: string;
};

export async function getAllOrganizers(): Promise<Organizer[]> {
  const { data } = await supabase
    .from('organizers')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as Organizer[]) || [];
}

export async function getOrganizer(id: number): Promise<Organizer | null> {
  const { data } = await supabase
    .from('organizers')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Organizer) || null;
}

export async function getOrganizerTournaments(organizerId: number) {
  const { data } = await supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createOrganizer(
  name: string,
  tag: string,
  description: string,
  logoUrl: string | null = null
) {
  const { data, error } = await supabase
    .from('organizers')
    .insert({
      name: name.trim(),
      tag: tag.trim().toUpperCase() || null,
      description: description.trim() || null,
      logo_url: logoUrl,
    })
    .select()
    .single();
  return { data, error };
}

export async function deleteOrganizer(id: number) {
  return await supabase.from('organizers').delete().eq('id', id);
}