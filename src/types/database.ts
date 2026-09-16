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
  song_id?: string | null;
  title: string;
  section: 'main' | 'encore';
  position: number;
  is_cover?: boolean;
  original_artist?: string | null;
  guest_artist?: string | null;
  note?: string | null;
  youtube_url?: string | null;
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
  ticket_url: string | null;
  is_upcoming: boolean;
};

export type SetlistSongDetail = {
  id: string;
  setlist_id: string;
  song_id: string | null;
  title: string;
  custom_title: string | null;
  section: 'main' | 'encore';
  position: number;
  is_cover: boolean;
  original_artist_name: string | null;
  guest_artist: string | null;
  note: string | null;
  album_name: string | null;
  album_image_url: string | null;
  release_date: string | null;
  external_track_id: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
};

export type CommentDetail = {
  id: string;
  setlist_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type SongCatalogItem = {
  id: string;
  artist_id: string;
  artist_name: string;
  title: string;
  album_id: string | null;
  album_name: string | null;
  album_image_url: string | null;
  release_date: string | null;
  external_track_id: string | null;
  spotify_url: string | null;
};

export type ArtistStatistic = {
  id: string;
  name: string;
  sort_name: string;
  concert_count: number;
  setlist_count: number;
  latest_performance_date: string | null;
  image_url: string | null;
  bio: string | null;
  activity_type: string | null;
  country_code: string | null;
  spotify_url: string | null;
  metadata_status: 'pending' | 'complete' | 'failed' | 'not_available';
  metadata_source: string | null;
  metadata_updated_at: string | null;
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
  road_address: string | null;
  latitude: number | null;
  longitude: number | null;
  geocode_status: 'pending' | 'complete' | 'failed' | 'not_available';
  geocode_source: string | null;
  geocoded_at: string | null;
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
        id: string; name: string; sort_name: string; image_url: string | null; bio: string | null; activity_type: string | null; country_code: string | null; spotify_url: string | null; metadata_status: 'pending' | 'complete' | 'failed' | 'not_available'; metadata_source: string | null; metadata_updated_at: string | null; metadata_error: string | null; created_at: string; updated_at: string;
      }>;
      venues: Table<{
        id: string; name: string; province: string | null; district: string | null; address_detail: string | null; road_address: string | null; latitude: number | null; longitude: number | null; geocode_status: 'pending' | 'complete' | 'failed' | 'not_available'; geocode_source: string | null; geocoded_at: string | null; geocode_error: string | null; created_at: string; updated_at: string;
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
      comments: Table<{
        id: string; setlist_id: string; user_id: string; content: string; created_at: string; updated_at: string;
      }, { id?: string; setlist_id: string; user_id: string; content: string; created_at?: string; updated_at?: string }>;
      setlist_bookmarks: Table<{
        user_id: string; setlist_id: string; created_at: string;
      }, { user_id: string; setlist_id: string; created_at?: string }>;
      setlist_activity: Table<{
        id: number; setlist_id: string | null; actor_id: string | null; action: 'created' | 'edited' | 'deleted'; reason: string | null; snapshot: Json; created_at: string;
      }, { id?: number; setlist_id?: string | null; actor_id: string; action: 'created' | 'edited'; reason?: string | null; snapshot?: Json; created_at?: string }>;
    };
    Views: {
      setlist_overview: View<SetlistOverview>;
      setlist_song_details: View<SetlistSongDetail>;
      artist_statistics: View<ArtistStatistic>;
      venue_statistics: View<VenueStatistic>;
      festival_statistics: View<FestivalStatistic>;
      song_statistics: View<SongStatistic>;
      artist_song_statistics: View<ArtistSongStatistic>;
      comment_details: View<CommentDetail>;
      song_catalog: View<SongCatalogItem>;
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
          p_road_address: string | null;
          p_ticket_url: string | null;
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
          p_road_address: string | null;
          p_ticket_url: string | null;
        };
        Returns: string;
      };
      delete_setlist: {
        Args: { p_setlist_id: string };
        Returns: boolean;
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
