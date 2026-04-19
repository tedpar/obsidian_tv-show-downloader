# TV Show Downloader (Obsidian Plugin)

An Obsidian plugin that allows you to effortlessly search for TV shows using TheMovieDB (TMDB) API and automatically generate comprehensive markdown notes for them in your vault. Each generated note includes detailed metadata stored in YAML frontmatter (such as name, overview, original image URLs, streaming providers, and more).

## Features

- **Search TV Shows**: Quickly search the TMDB database directly from within Obsidian.
- **Rich Metadata**: Automatically extracts metadata into YAML frontmatter. Empty or null values are automatically omitted from the final note.
- **Streaming Providers**: Retrieves streaming provider availability. Defaults to the `SE` (Sweden) region, but is configurable.
- **Customizable Organization**: Define a specific folder where all your TV show notes will be saved. File names are sanitized for cross-platform compatibility (invalid Windows path characters are replaced, trailing dots/spaces removed, and reserved DOS names avoided).
- **Auto-Open**: Optionally open the newly created note immediately after saving.
- **Custom Templates**: Define your own Markdown template to control exactly how the metadata is structured and formatted in the resulting note.

## Setup & Configuration

**Important:** To use this plugin, you must provide your own TMDB API key. 

1. **Get an API Key**: 
   - Create an account on [TheMovieDB.org (TMDB)](https://www.themoviedb.org/).
   - Navigate to your account settings and generate an API key under the "API" section.
2. **Install the Plugin**: 
   - *If manually installing*: Clone the repository into your Obsidian vault's `.obsidian/plugins/tv-show-downloader/` directory, run `npm install`, and then run `npm run build`.
3. **Configure Settings**:
   - Go to your Obsidian Settings -> Community Plugins -> TV Show Downloader.
   - Enter your **TMDB API Key**.
   - Set your **Save Folder** path (where notes will be created).
   - Configure your **Provider Region** (e.g., `US`, `GB`, `SE`).
   - (Optional) Set a **Template File Path** to customize the generated note's frontmatter.

## Templates

By default, the plugin uses a built-in template that extracts all available TMDB properties into the note's YAML frontmatter. If you want to customize which properties are included or change their YAML keys, you can create a custom Markdown template in your vault and point the plugin to it in the settings.

### How Properties are Mapped

Properties are mapped using double curly braces (e.g., `{{name}}`). When the note is generated:
1. **Arrays**: If a property is an array (like `genres` or `networks`), the plugin extracts their names and formats them as a proper YAML list.
2. **Empty Values**: If a property has no value, is `null`, or an array is empty, **the entire line containing that property placeholder will be skipped and omitted from the final note**.
3. **Images**: `poster_path` and `backdrop_path` are automatically converted into full `original` resolution image URLs.
4. **Regions**: You can use `{{region}}` to dynamically insert your configured region code (uppercase, e.g. `SE`, `US`) into a property key.

### Available Properties

You can use any of the following properties in your template.

**Standard TMDB Properties:**
- `{{id}}` - TMDB ID of the show
- `{{name}}` - The title of the show
- `{{original_name}}` - The original title
- `{{overview}}` - A summary of the plot
- `{{tagline}}` - The show's tagline
- `{{first_air_date}}` - Initial release date
- `{{last_air_date}}` - Most recent episode date
- `{{status}}` - Current show status (e.g., Ended, Returning Series)
- `{{in_production}}` - Boolean indicating if it's still in production
- `{{type}}` - Type of the show (e.g., Scripted, Miniseries)
- `{{number_of_seasons}}` - Total seasons
- `{{number_of_episodes}}` - Total episodes
- `{{popularity}}` - TMDB popularity score
- `{{vote_average}}` - Average rating score
- `{{vote_count}}` - Total number of votes
- `{{original_language}}` - Code of the original language
- `{{poster_path}}` - Full URL to the poster image
- `{{backdrop_path}}` - Full URL to the backdrop/fanart image

**Array Properties (Will output as a YAML list):**
- `{{genres}}` - List of genre names
- `{{networks}}` - List of network/channel names
- `{{created_by}}` - List of creators
- `{{production_companies}}` - List of production companies
- `{{production_countries}}` - List of country codes
- `{{spoken_languages}}` - List of language codes
- `{{seasons}}` - List of season names
- `{{episode_run_time}}` - List of runtimes
- `{{languages}}` - List of languages
- `{{origin_country}}` - List of origin countries

**Custom Plugin Properties:**
- `{{tmdb_url}}` - A direct link to the show's page on TheMovieDB.org.
- `{{streaming_providers}}` - List of active streaming providers (e.g., Netflix, Hulu) for your region.
- `{{rent_providers}}` - List of services where you can rent the show in your region.
- `{{buy_providers}}` - List of services where you can buy the show in your region.
- `{{region}}` - The region code (e.g., `SE`, `US`) from your configured provider region. Often used dynamically in keys like: `streaming_{{region}}: {{streaming_providers}}`.

*Note: The `homepage` property from TMDB is intentionally excluded.*

### Example Template

```yaml
---
id: {{id}}
title: {{name}}
plot: {{overview}}
cover: {{poster_path}}
genres: {{genres}}
rating: {{vote_average}}
status: {{status}}
first_aired: {{first_air_date}}
streaming_on_{{region}}: {{streaming_providers}}
---
```

## Building from Source

If you wish to compile the plugin yourself from the source code, use the following commands:

- `npm run dev` — Compiles a single build with inline sourcemaps.
- `npm run build` — Compiles a production-ready, tree-shaken build without sourcemaps.

*Note: The build entry point is `src/main.ts` and outputs to `main.js`.*

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. 

Powered by [TheMovieDB.org](https://www.themoviedb.org/).
