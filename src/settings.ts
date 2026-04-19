import { App, PluginSettingTab, Setting, AbstractInputSuggest, Notice } from "obsidian";
import TVShowSearchPlugin from "./main";
import { fetchWatchProviderRegions } from "./tmdb";

interface RegionOption {
  code: string;
  name: string;
  label: string;
}

const FALLBACK_REGION_OPTIONS: RegionOption[] = [
  ["SE", "Sweden"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["ES", "Spain"],
  ["IT", "Italy"],
  ["NL", "Netherlands"],
  ["NO", "Norway"],
  ["DK", "Denmark"],
  ["FI", "Finland"],
  ["PL", "Poland"],
  ["BR", "Brazil"],
  ["MX", "Mexico"],
  ["AR", "Argentina"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["IN", "India"],
].map(([code, name]) => ({ code, name, label: `${name} (${code})` }));

class FolderSuggest extends AbstractInputSuggest<string> {
  private handleSelect: (value: string) => void | Promise<void>;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    onSelect: (value: string) => void | Promise<void>
  ) {
    super(app, inputEl);
    this.handleSelect = onSelect;
  }

  getSuggestions(query: string): string[] {
    const folders = this.app.vault.getAllFolders();
    return folders
      .map((f) => f.path)
      .filter((path) => path.toLowerCase().includes(query.toLowerCase()));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
    this.setValue(value);
    void this.handleSelect(value);
    this.close();
  }
}

export interface TVShowSearchSettings {
  apiKey: string;
  saveFolder: string;
  providerRegion: string;
  openAfterSave: boolean;
  templateFilePath: string;
}

export const DEFAULT_SETTINGS: TVShowSearchSettings = {
  apiKey: "",
  saveFolder: "TV Shows",
  providerRegion: "SE",
  openAfterSave: true,
  templateFilePath: "",
};

class MarkdownFileSuggest extends AbstractInputSuggest<string> {
  private handleSelect: (value: string) => void | Promise<void>;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    onSelect: (value: string) => void | Promise<void>
  ) {
    super(app, inputEl);
    this.handleSelect = onSelect;
  }

  getSuggestions(query: string): string[] {
    const files = this.app.vault.getMarkdownFiles();
    return files
      .map((f) => f.path)
      .filter((path) => path.toLowerCase().includes(query.toLowerCase()));
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
    this.setValue(value);
    void this.handleSelect(value);
    this.close();
  }
}

class RegionSuggest extends AbstractInputSuggest<RegionOption> {
  private getOptions: () => RegionOption[];
  private handleSelect: (code: string) => void | Promise<void>;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    getOptions: () => RegionOption[],
    onSelect: (code: string) => void | Promise<void>
  ) {
    super(app, inputEl);
    this.getOptions = getOptions;
    this.handleSelect = onSelect;
  }

  getSuggestions(query: string): RegionOption[] {
    const q = query.trim().toLowerCase();
    const options = this.getOptions();
    if (!q) return options.slice(0, 30);

    return options
      .filter(
        (opt) =>
          opt.code.toLowerCase().includes(q) ||
          opt.name.toLowerCase().includes(q) ||
          opt.label.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }

  renderSuggestion(value: RegionOption, el: HTMLElement): void {
    el.setText(value.label);
  }

  selectSuggestion(value: RegionOption, _evt: MouseEvent | KeyboardEvent): void {
    this.setValue(value.label);
    void this.handleSelect(value.code);
    this.close();
  }
}

export class TVShowSearchSettingTab extends PluginSettingTab {
  plugin: TVShowSearchPlugin;
  private regionOptions: RegionOption[] = FALLBACK_REGION_OPTIONS;
  private loadingRegions = false;
  private loadedForApiKey = "";
  private apiKeySaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(app: App, plugin: TVShowSearchPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.ensureRegionOptionsLoaded();

    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "TV Show Downloader" });

    new Setting(containerEl)
      .setName("TMDB API Key")
      .setDesc("Your The Movie Database API key")
      .addText((text) =>
        text
          .setPlaceholder("Enter your TMDB API key")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            if (this.apiKeySaveTimer) clearTimeout(this.apiKeySaveTimer);
            this.apiKeySaveTimer = setTimeout(async () => {
              await this.plugin.saveSettings();
            }, 500);
          })
      );

    new Setting(containerEl)
      .setName("Save folder")
      .setDesc(
        "Folder path where TV show markdown files will be saved (created automatically if it doesn't exist)"
      )
      .addSearch((cb) => {
        const saveFolder = async (value: string): Promise<void> => {
          this.plugin.settings.saveFolder = value;
          await this.plugin.saveSettings();
        };

        new FolderSuggest(this.app, cb.inputEl, saveFolder);
        cb.setPlaceholder("TV Shows")
          .setValue(this.plugin.settings.saveFolder)
          .onChange(saveFolder);
      });

    new Setting(containerEl)
      .setName("Provider region")
      .setDesc(
        "Select the country/region used for streaming provider lookup"
      )
      .addSearch((cb) => {
        const saveRegionCode = async (code: string): Promise<void> => {
          const normalized = this.normalizeRegionCode(code);
          this.plugin.settings.providerRegion = normalized;
          await this.plugin.saveSettings();
          cb.setValue(this.getRegionLabel(normalized));
        };

        new RegionSuggest(this.app, cb.inputEl, () => this.regionOptions, saveRegionCode);

        cb
          .setPlaceholder("Sweden (SE)")
          .setValue(this.getRegionLabel(this.plugin.settings.providerRegion))
          .onChange(async (value) => {
            const parsedCode = this.parseRegionInput(value);
            if (!parsedCode) {
              new Notice("Invalid region. Please select from the list.");
              return;
            }
            await saveRegionCode(parsedCode);
          });
      });

    new Setting(containerEl)
      .setName("Open file after save")
      .setDesc("Automatically open the markdown file after saving")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.openAfterSave)
          .onChange(async (value) => {
            this.plugin.settings.openAfterSave = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Template file path")
      .setDesc(
        "Path to a markdown file in your vault used as the frontmatter template. Leave empty to use the built-in default template."
      )
      .addSearch((cb) => {
        const saveTemplatePath = async (value: string): Promise<void> => {
          this.plugin.settings.templateFilePath = value;
          await this.plugin.saveSettings();
        };

        new MarkdownFileSuggest(this.app, cb.inputEl, saveTemplatePath);
        cb
          .setPlaceholder("Templates/tv-show-template.md")
          .setValue(this.plugin.settings.templateFilePath)
          .onChange(saveTemplatePath);
      });
  }

  private async ensureRegionOptionsLoaded(): Promise<void> {
    const apiKey = this.plugin.settings.apiKey.trim();
    if (!apiKey || this.loadingRegions || this.loadedForApiKey === apiKey) return;

    this.loadingRegions = true;
    try {
      const regions = await fetchWatchProviderRegions(apiKey);
      if (regions.length > 0) {
        const mapped = regions.map((region) => {
          const code = region.iso_3166_1.toUpperCase();
          const name = region.english_name;
          return { code, name, label: `${name} (${code})` };
        });

        const deduped = new Map<string, RegionOption>();
        for (const region of mapped) {
          deduped.set(region.code, region);
        }

        this.regionOptions = [...deduped.values()].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        this.loadedForApiKey = apiKey;
      }
    } catch {
      this.loadedForApiKey = "";
    } finally {
      this.loadingRegions = false;
    }
  }

  private normalizeRegionCode(value: string): string {
    const normalized = value.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(normalized)) return normalized;
    return "SE";
  }

  private parseRegionInput(value: string): string | null {
    const input = value.trim();
    if (!input) return null;

    const codeMatch = input.match(/\(([A-Za-z]{2})\)$/);
    if (codeMatch) return codeMatch[1].toUpperCase();

    if (/^[A-Za-z]{2}$/.test(input)) return input.toUpperCase();

    const lower = input.toLowerCase();
    const byName = this.regionOptions.find((opt) => opt.name.toLowerCase() === lower);
    if (byName) return byName.code;

    const byLabel = this.regionOptions.find((opt) => opt.label.toLowerCase() === lower);
    if (byLabel) return byLabel.code;

    return null;
  }

  private getRegionLabel(codeValue: string): string {
    const code = this.normalizeRegionCode(codeValue);
    const found = this.regionOptions.find((opt) => opt.code === code);
    return found ? found.label : code;
  }
}
