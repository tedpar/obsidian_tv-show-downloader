import { requestUrl } from "obsidian";

export const TMDB_BASE = "https://api.themoviedb.org/3";
export const IMG_BASE = "https://image.tmdb.org/t/p/w342";
export const IMG_ORIGINAL = "https://image.tmdb.org/t/p/original";
export const LOGO_BASE = "https://image.tmdb.org/t/p/w45";
export const TMDB_SHOW_BASE = "https://www.themoviedb.org/tv";

export interface TVShowResult {
  id: number;
  name: string;
  first_air_date: string;
  poster_path: string | null;
  vote_average: number;
  origin_country: string[];
  overview: string;
}

export interface Provider {
  name: string;
  logo: string;
}

export interface Providers {
  stream: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export interface TMDBProviderInfo {
  provider_name: string;
  logo_path: string;
}

export interface TMDBWatchRegionData {
  flatrate?: TMDBProviderInfo[];
  rent?: TMDBProviderInfo[];
  buy?: TMDBProviderInfo[];
}

export interface TMDBWatchProviderRegion {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export interface TVShowDetails {
  backdrop_path: string | null;
  created_by: Array<{ id: number; name: string; credit_id: string; gender: number; profile_path: string | null }>;
  episode_run_time: number[];
  first_air_date: string;
  genres: Array<{ id: number; name: string }>;
  id: number;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  name: string;
  networks: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }>;
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }>;
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  seasons: Array<{ id: number; name: string; overview: string | null; poster_path: string | null; season_number: number; air_date: string | null }>;
  spoken_languages: Array<{ iso_639_1: string; name: string; english_name: string }>;
  status: string;
  tagline: string;
  type: string;
  vote_average: number;
  vote_count: number;
  homepage: string | null;
}

export async function searchTVShows(
  apiKey: string,
  query: string
): Promise<TVShowResult[]> {
  const page1 = await requestUrl({
    url: `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=1`,
  });

  const results1 = page1.json.results || [];
  const filtered1 = results1.filter((s: TVShowResult) => s.first_air_date);

  if (filtered1.length >= 20) {
    return filtered1
      .sort((a: TVShowResult, b: TVShowResult) =>
        b.first_air_date.localeCompare(a.first_air_date)
      )
      .slice(0, 25);
  }

  const page2 = await requestUrl({
    url: `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=2`,
  });

  const all = [...filtered1, ...(page2.json.results || [])];
  return all
    .filter((s: TVShowResult) => s.first_air_date)
    .sort((a: TVShowResult, b: TVShowResult) =>
      b.first_air_date.localeCompare(a.first_air_date)
    )
    .slice(0, 25);
}

export async function fetchProviders(
  apiKey: string,
  tvId: number,
  region: string
): Promise<Providers> {
  const response = await requestUrl({
    url: `${TMDB_BASE}/tv/${tvId}/watch/providers?api_key=${apiKey}`,
  });
  const data = response.json as { results?: Record<string, TMDBWatchRegionData> };
  const regionData = data.results?.[region];
  if (!regionData) return { stream: [], rent: [], buy: [] };

  return {
    stream: (regionData.flatrate || []).map((p: TMDBProviderInfo) => ({
      name: p.provider_name,
      logo: p.logo_path,
    })),
    rent: (regionData.rent || []).map((p: TMDBProviderInfo) => ({
      name: p.provider_name,
      logo: p.logo_path,
    })),
    buy: (regionData.buy || []).map((p: TMDBProviderInfo) => ({
      name: p.provider_name,
      logo: p.logo_path,
    })),
  };
}

export async function fetchTVDetails(
  apiKey: string,
  tvId: number
): Promise<TVShowDetails> {
  const response = await requestUrl({
    url: `${TMDB_BASE}/tv/${tvId}?api_key=${apiKey}`,
  });
  return response.json as TVShowDetails;
}

export async function fetchWatchProviderRegions(
  apiKey: string
): Promise<TMDBWatchProviderRegion[]> {
  const key = apiKey.trim();
  if (!key) return [];

  const response = await requestUrl({
    url: `${TMDB_BASE}/watch/providers/regions?api_key=${key}&language=en-US`,
  });

  const data = response.json as { results?: TMDBWatchProviderRegion[] };
  return (data.results || []).slice().sort((a, b) =>
    a.english_name.localeCompare(b.english_name)
  );
}
