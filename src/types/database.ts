export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

type View<Row> = { Row: Row; Relationships: Relationship[] };

export type SongInput = {
  title: string;
  section: 'main' | 'encore';
  position: number;
  is_cover?: boolean;
  original_artist?: string | null;
  guest_artist?: string | null;
  note?: string | null;
};

export type SetlistOverview = {
  id: string;
  artist_id: string;
  artist_name: string;
  performance_date: string;
  concert_title: string | null;
  venue_id: string | null;
  venue_name: string | null;
  region: string | null;
  festival_id: string | null;
  festival_name: string | null;
  tour_name: string | null;
  song_count: number;
  author_id: string;
  created_at: string;
  updated_at: string;
};

export type SetlistSongDetail = {
  id: string;
  setlist_id: string;
  song_id: string;
  title: string;
  section: 'main' | 'encore';
  position: number;
  is_cover: boolean;
  original_artist_name: string | null;
  guest_artist: string | null;
  note: string | null;
};

export type ArtistStatistic = {
  id: string;
  name: string;
  sort_name: string;
  concert_count: number;
  setlist_count: number;
  latest_performance_date: string | null;
};

export type VenueStatistic = {
  id: string;
  name: string;
  province: string | null;
  district: string | null;
  address_detail: string | null;
  concert_count: number;
  artist_count: number;
  latest_performance_date: string | null;
};

export type FestivalStatistic = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  concert_count: number;
  artist_count: number;
};

export type SongStatistic = {
  song_id: string;
  title: string;
  artist_name: string;
  play_count: number;
};

export type ArtistSongStatistic = {
  artist_id: string;
  song_id: string;
  title: string;
  play_count: number;
};

export interface Database {
  public: {
    Tables: {
      artists: Table<{
        id: string; name: string; sort_name: string; created_at: string; updated_at: string;
      }>;
      venues: Table<{
        id: string; name: string; province: string | null; district: string | null; address_detail: string | null; created_at: string; updated_at: string;
      }>;
      festivals: Table<{
        id: string; name: string; start_date: string | null; end_date: string | null; venue_id: string | null; created_at: string; updated_at: string;
      }>;
      profiles: Table<{
        id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string;
      }>;
      attendances: Table<{
        user_id: string; setlist_id: string; created_at: string;
      }, { user_id?: string; setlist_id: string; created_at?: string }>;
    };
    Views: {
      setlist_overview: View<SetlistOverview>;
      setlist_song_details: View<SetlistSongDetail>;
      artist_statistics: View<ArtistStatistic>;
      venue_statistics: View<VenueStatistic>;
      festival_statistics: View<FestivalStatistic>;
      song_statistics: View<SongStatistic>;
      artist_song_statistics: View<ArtistSongStatistic>;
    };
    Functions: {
      create_setlist: {
        Args: {
          p_artist_name: string;
          p_performance_date: string;
          p_concert_title: string | null;
          p_venue_name: string | null;
          p_province: string | null;
          p_district: string | null;
          p_address_detail: string | null;
          p_festival_name: string | null;
          p_tour_name: string | null;
          p_songs: Json;
        };
        Returns: string;
      };
      replace_setlist: {
        Args: {
          p_setlist_id: string;
          p_artist_name: string;
          p_performance_date: string;
          p_concert_title: string | null;
          p_venue_name: string | null;
          p_province: string | null;
          p_district: string | null;
          p_address_detail: string | null;
          p_festival_name: string | null;
          p_tour_name: string | null;
          p_songs: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type SearchResult = {
  id: string;
  type: 'artist' | 'setlist' | 'venue' | 'festival';
  title: string;
  meta: string;
  href: string;
};
