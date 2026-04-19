# TV Show Markdown Frontmatter Properties

This document lists all properties included in the generated markdown frontmatter when exporting a TV show.

Properties come from the [TMDB TV Detail API](https://developer.themoviedb.org/reference/tv-series-details) and the [Watch Providers API](https://developer.themoviedb.org/reference/watch-providers) (Sweden region).

## Core Identifiers

| Property | Type | Description |
|---|---|---|
| `id` | number | TMDB unique identifier for the TV show |
| `name` | string | Official name of the TV show |
| `original_name` | string | Original name in the original language |
| `original_language` | string | ISO 639-1 code of the original language (e.g. `en`, `sv`) |

## Dates

| Property | Type | Description |
|---|---|---|
| `first_air_date` | string | Date of the first episode aired (YYYY-MM-DD) |
| `last_air_date` | string | Date of the most recent episode aired (YYYY-MM-DD) |

## Ratings & Popularity

| Property | Type | Description |
|---|---|---|
| `vote_average` | number | Average user rating (0–10) |
| `vote_count` | number | Total number of user votes |
| `popularity` | number | TMDB popularity score (composite metric) |

## Description

| Property | Type | Description |
|---|---|---|
| `overview` | string | Plot synopsis / summary of the show |
| `tagline` | string | Short promotional tagline |

## Images

| Property | Type | Description |
|---|---|---|
| `poster_path` | string | Full URL to the poster image (original resolution) |
| `backdrop_path` | string | Full URL to the backdrop image (original resolution) |

## Production

| Property | Type | Description |
|---|---|---|
| `created_by` | array | List of creator names |
| `production_companies` | array | List of production company names |
| `production_countries` | array | List of production country codes/names |
| `origin_country` | array | List of country codes where the show originated |
| `networks` | array | List of broadcasting network names |
| `companies` | array | List of associated company names |

## Classification

| Property | Type | Description |
|---|---|---|
| `genres` | array | List of genre names (e.g. Drama, Comedy) |
| `genre_ids` | array | List of TMDB genre IDs |
| `type` | string | Show type classification (e.g. Documentary, Scripted) |
| `status` | string | Current status (e.g. Returning Series, Ended, Canceled) |
| `adult` | boolean | Whether the show is rated adult content |
| `in_production` | boolean | Whether the show is currently in production |

## Episodes & Seasons

| Property | Type | Description |
|---|---|---|
| `number_of_seasons` | number | Total number of seasons |
| `number_of_episodes` | number | Total number of episodes across all seasons |
| `seasons` | array | List of season names/identifiers |
| `episode_run_time` | array | Typical episode runtime in minutes |
| `next_episode_to_air` | string | Info about the next upcoming episode |

## Languages & Locales

| Property | Type | Description |
|---|---|---|
| `languages` | array | List of language codes available for the show |
| `spoken_languages` | array | List of spoken language names/codes in the show |

## External IDs

| Property | Type | Description |
|---|---|---|
| `homepage` | string | Official website URL *(excluded from frontmatter)* |
| `imdb_id` | string | IMDb identifier (e.g. tt0944947) |

## Streaming Providers (Sweden)

These properties are sourced from the TMDB Watch Providers API, filtered to Sweden (SE).

| Property | Type | Description |
|---|---|---|
| `streaming_providers_se` | array | Services where the show is available to stream (subscription) |
| `rent_providers_se` | array | Services where the show can be rented |
| `buy_providers_se` | array | Services where the show can be purchased |

## Notes

- The plugin can load its frontmatter template from a vault markdown file via the `Template file path` setting
- The repository includes a starter template at `default-template.md`; copy this file into your vault and set its vault-relative path in plugin settings
- If no template path is set (or if the file cannot be read), the plugin falls back to the built-in default template
- Array properties are rendered as YAML arrays with `-` item syntax
- Image paths (`poster_path`, `backdrop_path`) include the full URL with `original` resolution
- Empty/null values are omitted from the frontmatter
- The `homepage` property is intentionally excluded from the frontmatter
