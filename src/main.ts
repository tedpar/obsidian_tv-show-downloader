import { Plugin } from "obsidian";
import { TVShowSearchModal } from "./modal";
import {
  TVShowSearchSettingTab,
  TVShowSearchSettings,
  DEFAULT_SETTINGS,
} from "./settings";

export default class TVShowSearchPlugin extends Plugin {
  settings: TVShowSearchSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("tv", "Search TV Shows", () => {
      new TVShowSearchModal(this.app, this).open();
    });

    this.addCommand({
      id: "search-tv-show",
      name: "Search for a TV show",
      callback: () => {
        new TVShowSearchModal(this.app, this).open();
      },
    });

    this.addSettingTab(new TVShowSearchSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
