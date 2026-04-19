import { App, Modal, Notice, TFile } from "obsidian";
import TVShowSearchPlugin from "./main";
import {
  searchTVShows,
  fetchTVDetails,
  fetchProviders,
  IMG_BASE,
  LOGO_BASE,
  TVShowResult,
  Providers,
  TVShowDetails,
} from "./tmdb";
import { DEFAULT_TEMPLATE, generateFrontmatter } from "./frontmatter";

const STAR_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

export class TVShowSearchModal extends Modal {
  private plugin: TVShowSearchPlugin;
  private searchView!: HTMLElement;
  private detailView!: HTMLElement;
  private searchInput: HTMLInputElement | null = null;
  private resultsEl: HTMLElement | null = null;
  private results: TVShowResult[] = [];
  private focusedIndex = -1;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private selectedDetails: TVShowDetails | null = null;
  private providers: Providers | null = null;
  private currentShow: TVShowResult | null = null;
  private searchRequestId = 0;
  private detailRequestId = 0;
  private inDetailView = false;
  private allowModalClose = false;
  private readonly onModalKeydown = (evt: KeyboardEvent) => {
    if (evt.key !== "Escape" || !this.inDetailView) return;
    evt.preventDefault();
    evt.stopPropagation();
    evt.stopImmediatePropagation();
    this.showSearchView();
  };


  constructor(app: App, plugin: TVShowSearchPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("tv-show-search-modal");
    this.modalEl.addEventListener("keydown", this.onModalKeydown, true);

    this.searchView = this.contentEl.createDiv({ cls: "tv-search-view" });
    this.detailView = this.contentEl.createDiv({ cls: "tv-detail-view" });
    this.detailView.hide();

    this.buildSearchUI();
    setTimeout(() => this.searchInput?.focus(), 50);
  }

  onClose() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.searchRequestId += 1;
    this.detailRequestId += 1;
    this.inDetailView = false;
    this.modalEl.removeEventListener("keydown", this.onModalKeydown, true);
  }

  close() {
    if (this.inDetailView && !this.allowModalClose) {
      this.showSearchView();
      return;
    }
    super.close();
  }

  private closeModal() {
    this.allowModalClose = true;
    try {
      super.close();
    } finally {
      this.allowModalClose = false;
    }
  }

  private buildSearchUI() {
    this.searchView.empty();

    const title = this.searchView.createEl("h2", {
      cls: "tv-search-title",
    });
    title.createEl("a", {
      cls: "tv-search-title-link",
      text: "The Movie DB Search",
      attr: {
        href: "https://www.themoviedb.org",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });

    const inputWrap = this.searchView.createDiv({ cls: "tv-search-input-wrap" });
    this.searchInput = inputWrap.createEl("input", {
      type: "text",
      cls: "tv-search-input",
      attr: { placeholder: "Search for a TV show...", autocomplete: "off" },
    });

    this.searchInput.addEventListener("input", () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      const q = this.searchInput!.value;
      this.debounceTimer = setTimeout(() => this.doSearch(q), 600);
    });

    this.searchInput.addEventListener("keydown", (e) =>
      this.onSearchKeydown(e)
    );

    this.resultsEl = this.searchView.createDiv({ cls: "tv-results" });
  }

  private onSearchKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (this.inDetailView) {
        this.showSearchView();
      } else {
        this.closeModal();
      }
      return;
    }

    if (this.results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.focusedIndex =
        this.focusedIndex < this.results.length - 1
          ? this.focusedIndex + 1
          : 0;
      this.highlightResult();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.focusedIndex =
        this.focusedIndex > 0
          ? this.focusedIndex - 1
          : this.results.length - 1;
      this.highlightResult();
    } else if (e.key === "Enter" && this.focusedIndex >= 0) {
      e.preventDefault();
      this.openDetail(this.results[this.focusedIndex]);
    }
  }

  private highlightResult() {
    if (!this.resultsEl) return;
    const cards = this.resultsEl.querySelectorAll(".tv-result-card");
    cards.forEach((c, i) =>
      (c as HTMLElement).toggleClass("focused", i === this.focusedIndex)
    );
    (cards[this.focusedIndex] as HTMLElement)?.scrollIntoView({
      block: "nearest",
    });
  }

  private async doSearch(query: string) {
    const requestId = ++this.searchRequestId;

    if (!query.trim()) {
      this.results = [];
      this.focusedIndex = -1;
      this.resultsEl?.empty();
      return;
    }

    if (!this.plugin.settings.apiKey.trim()) {
      this.resultsEl?.empty();
      this.resultsEl?.createEl("p", {
        text: "Please configure your TMDB API key in settings.",
        cls: "tv-error",
      });
      return;
    }

    this.resultsEl?.empty();
    const loading = this.resultsEl!.createDiv({ cls: "tv-loading" });
    loading.createDiv({ cls: "tv-spinner" });
    loading.createEl("p", { text: "Searching..." });

    try {
      const results = await searchTVShows(this.plugin.settings.apiKey, query);
      if (requestId !== this.searchRequestId) return;

      this.results = results;
      this.focusedIndex = -1;
      this.renderResults();
    } catch (err) {
      if (requestId !== this.searchRequestId) return;

      console.error("TV Show Downloader: Search failed", err);
      this.results = [];
      this.resultsEl?.empty();
      this.resultsEl?.createEl("p", {
        text: "Search failed. Check your API key.",
        cls: "tv-error",
      });
    }
  }

  private renderResults() {
    if (!this.resultsEl) return;
    this.resultsEl.empty();

    if (this.results.length === 0) {
      this.resultsEl.createEl("p", {
        text: "No results found. Try a different search term.",
        cls: "tv-empty",
      });
      return;
    }

    for (let i = 0; i < this.results.length; i++) {
      const show = this.results[i];
      const card = this.resultsEl.createDiv({ cls: "tv-result-card" });
      card.addEventListener("click", () => this.openDetail(show));
      card.addEventListener("mouseenter", () => {
        this.focusedIndex = i;
        this.highlightResult();
      });

      if (show.poster_path) {
        card.createEl("img", {
          cls: "tv-result-poster",
          attr: {
            src: `${IMG_BASE}${show.poster_path}`,
            alt: show.name,
            loading: "lazy",
          },
        });
      } else {
        card.createDiv({
          cls: "tv-result-poster-placeholder",
          text: "No Image",
        });
      }

      const info = card.createDiv({ cls: "tv-result-info" });
      info.createDiv({ cls: "tv-result-title", text: show.name });

      const meta = info.createDiv({ cls: "tv-result-meta" });
      const yr = show.first_air_date
        ? new Date(show.first_air_date).getFullYear()
        : "";
      if (yr) meta.createSpan({ text: String(yr) });
      if (show.vote_average > 0) {
        const ratingEl = meta.createSpan({ cls: "tv-result-rating" });
        ratingEl.innerHTML = STAR_SVG;
        ratingEl.createSpan({ text: ` ${show.vote_average.toFixed(1)}` });
      }
      if (show.origin_country?.[0])
        meta.createSpan({ text: show.origin_country[0] });

      if (show.overview) {
        info.createDiv({ cls: "tv-result-overview", text: show.overview });
      }
    }
  }

  private async openDetail(show: TVShowResult) {
    const requestId = ++this.detailRequestId;
    const providerRegion = this.normalizeRegion(this.plugin.settings.providerRegion);

    this.currentShow = show;
    this.inDetailView = true;
    this.searchView.hide();
    this.detailView.empty();
    this.detailView.show();
    this.detailView.setAttribute("tabindex", "-1");
    this.detailView.focus();

    const backBtn = this.detailView.createEl("button", {
      cls: "tv-back-btn",
      text: "\u2190 Back to results",
    });
    backBtn.addEventListener("click", () => this.showSearchView());

    const loadingEl = this.detailView.createDiv({ cls: "tv-loading" });
    loadingEl.createDiv({ cls: "tv-spinner" });
    loadingEl.createEl("p", { text: "Loading details..." });

    try {
      const [details, providers] = await Promise.all([
        fetchTVDetails(this.plugin.settings.apiKey, show.id),
        fetchProviders(
          this.plugin.settings.apiKey,
          show.id,
          providerRegion
        ),
      ]);
      if (requestId !== this.detailRequestId) return;

      this.selectedDetails = details;
      this.providers = providers;
      loadingEl.remove();
      this.renderDetailContent(show, details, providers, providerRegion);
    } catch (err) {
      if (requestId !== this.detailRequestId) return;

      console.error("TV Show Downloader: Failed to load details", err);
      loadingEl.empty();
      loadingEl.createEl("p", {
        text: "Failed to load details.",
        cls: "tv-error",
      });
    }
  }

  private renderDetailContent(
    show: TVShowResult,
    details: TVShowDetails,
    providers: Providers,
    providerRegion: string
  ) {
    const header = this.detailView.createDiv({ cls: "tv-detail-header" });

    if (show.poster_path) {
      header.createEl("img", {
        cls: "tv-detail-poster",
        attr: { src: `${IMG_BASE}${show.poster_path}`, alt: show.name },
      });
    }

    const titleSection = header.createDiv({ cls: "tv-detail-title-section" });
    titleSection.createEl("a", {
      cls: "tv-detail-title",
      text: show.name,
      attr: {
        href: `https://www.themoviedb.org/tv/${show.id}`,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });

    const meta = titleSection.createDiv({ cls: "tv-detail-meta" });
    const yr = show.first_air_date
      ? new Date(show.first_air_date).getFullYear()
      : "";
    if (yr) meta.createSpan({ text: String(yr) });
    if (show.vote_average > 0) {
      const ratingEl = meta.createSpan({ cls: "tv-result-rating" });
      ratingEl.innerHTML = STAR_SVG;
      ratingEl.createSpan({ text: ` ${show.vote_average.toFixed(1)}` });
    }
    if (show.origin_country?.[0])
      meta.createSpan({ text: show.origin_country[0] });

    if (show.overview) {
      titleSection.createEl("p", {
        cls: "tv-detail-overview",
        text: show.overview,
      });
    }

    const provSection = this.detailView.createDiv({
      cls: "tv-providers-section",
    });
    const region = providerRegion;
    provSection.createEl("h3", { text: `Streaming in ${region}` });

    const hasAny =
      providers.stream.length > 0 ||
      providers.rent.length > 0 ||
      providers.buy.length > 0;

    if (hasAny) {
      if (providers.stream.length > 0)
        this.renderProviderGroup(provSection, "Stream", providers.stream, "stream");
      if (providers.rent.length > 0)
        this.renderProviderGroup(provSection, "Rent", providers.rent, "rent");
      if (providers.buy.length > 0)
        this.renderProviderGroup(provSection, "Buy", providers.buy, "buy");
    } else {
      provSection.createEl("p", {
        text: `No streaming providers available in ${region}`,
        cls: "tv-no-providers",
      });
    }

    const saveBtn = this.detailView.createEl("button", {
      cls: "tv-save-btn",
      text: "Save to Vault",
    });
    saveBtn.addEventListener("click", () => this.saveMarkdown(show));
    setTimeout(() => saveBtn.focus(), 0);
  }

  private showSearchView() {
    this.detailRequestId += 1;
    this.inDetailView = false;
    this.detailView.hide();
    this.searchView.show();
    setTimeout(() => this.searchInput?.focus(), 50);
  }

  private renderProviderGroup(
    container: HTMLElement,
    label: string,
    items: { name: string; logo: string }[],
    cls: string
  ) {
    const group = container.createDiv({ cls: "tv-provider-group" });
    group.createEl("span", { cls: `tv-provider-label ${cls}`, text: label });
    const list = group.createDiv({ cls: "tv-provider-list" });
    for (const p of items) {
      const chip = list.createDiv({ cls: "tv-provider-chip" });
      if (p.logo) {
        chip.createEl("img", {
          cls: "tv-provider-logo",
          attr: { src: `${LOGO_BASE}${p.logo}`, alt: p.name },
        });
      }
      chip.createSpan({ text: p.name });
    }
  }

  private async saveMarkdown(show: TVShowResult) {
    if (!this.selectedDetails || !this.providers) return;
    const providerRegion = this.normalizeRegion(this.plugin.settings.providerRegion);

    const template = await this.resolveTemplateContent();

    const content = generateFrontmatter(
      this.selectedDetails,
      this.providers,
      providerRegion,
      template
    );
    const folder = this.plugin.settings.saveFolder;
    const fileName = `${this.sanitizeFileName(show.name)}.md`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    try {
      if (folder) await this.ensureFolder(folder);

      const existing = this.app.vault.getAbstractFileByPath(filePath);
      if (existing instanceof TFile) {
        await this.app.vault.modify(existing, content);
        new Notice(`Updated ${fileName}`);
      } else {
        await this.app.vault.create(filePath, content);
        new Notice(`Created ${fileName}`);
      }

      if (this.plugin.settings.openAfterSave) {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file);
        }
      }

      this.closeModal();
    } catch (err) {
      new Notice(`Failed to save: ${(err as Error).message}`);
    }
  }

  private async resolveTemplateContent(): Promise<string> {
    const templatePath = this.plugin.settings.templateFilePath.trim();
    if (!templatePath) return DEFAULT_TEMPLATE;

    const file = this.app.vault.getAbstractFileByPath(templatePath);
    if (!(file instanceof TFile)) {
      new Notice(
        `Template file not found: ${templatePath}. Using built-in template.`
      );
      return DEFAULT_TEMPLATE;
    }

    try {
      const content = await this.app.vault.read(file);
      if (!content.trim()) {
        new Notice("Template file is empty. Using built-in template.");
        return DEFAULT_TEMPLATE;
      }
      return content;
    } catch (err) {
      new Notice(`Failed to read template file: ${(err as Error).message}`);
      return DEFAULT_TEMPLATE;
    }
  }

  private async ensureFolder(folderPath: string) {
    if (!folderPath || folderPath === "/") return;

    if (this.app.vault.getAbstractFileByPath(folderPath)) return;

    const parts = folderPath.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const folder = this.app.vault.getAbstractFileByPath(current);
      if (!folder) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  private normalizeRegion(value: string): string {
    const normalized = value.trim().toUpperCase();
    return normalized || "SE";
  }

  private sanitizeFileName(name: string): string {
    const replaced = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
    const withoutTrailingDotsAndSpaces = replaced.replace(/[. ]+$/g, "");
    const safe = withoutTrailingDotsAndSpaces || "untitled";
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    return reserved.test(safe) ? `${safe}_` : safe;
  }
}
