import { ItemView, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { TagStatsComponent } from "./TagStatsView";

export const VIEW_TYPE_CUSTOM_TAGS = "custom-tag-stats-view";

export class CustomTagView extends ItemView {
    private root: ReactDOM.Root | null = null;
    private sortBy: "frequency" | "name" = "frequency";
    private activeSymbol: string = "ALL";

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() { return VIEW_TYPE_CUSTOM_TAGS; }
    getDisplayText() { return "Custom Tag Stats"; }

    async onOpen() {
        this.render();
        this.registerEvent(this.app.metadataCache.on("changed", () => this.render()));
    }

    async onClose() {
        if (this.root) {
            this.root.unmount();
        }
    }

    async render() {
        const container = this.containerEl.children[1] as HTMLElement;
        if (!container) return;

        const tagCounts = await this.getTagCounts();

        if (!this.root) {
            this.root = ReactDOM.createRoot(container);
        }

        this.root.render(
            <TagStatsComponent 
                tagCounts={tagCounts}
                activeSymbol={this.activeSymbol}
                sortBy={this.sortBy}
                onSymbolChange={(sym) => { this.activeSymbol = sym; this.render(); }}
                onSortChange={() => { this.sortBy = this.sortBy === "frequency" ? "name" : "frequency"; this.render(); }}
                onTagClick={(tag) => this.executeSearch(tag)}
            />
        );
    }

    // getTagCounts() 및 executeSearch(tag) 함수는 기존 코드를 그대로 아래에 붙여넣으세요.
    async getTagCounts(): Promise<Record<string, number>> {
        const files = this.app.vault.getMarkdownFiles();
        const tagCounts: Record<string, number> = {};
        const regex = /([ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ])\.([^\s]+)/gu;

        for (const file of files) {
            const content = await this.app.vault.cachedRead(file);
            let match;
            while ((match = regex.exec(content)) !== null) {
                const tagName = match[0];
                tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            }
        }
        return tagCounts;
    }

    async executeSearch(tag: string) {
        await this.app.commands.executeCommandById("global-search:open");
        await new Promise(r => setTimeout(r, 150));
        const searchLeaf = this.app.workspace.getLeavesOfType("search")[0];
        if (searchLeaf?.view) {
            const searchView = searchLeaf.view as any;
            this.app.workspace.revealLeaf(searchLeaf);
            const query = `"${tag}"`;
            if (searchView.setQuery) searchView.setQuery(query);
            const inputEl = searchView.searchComponent?.inputEl || searchView.containerEl.querySelector("input");
            if (inputEl) {
                inputEl.value = query;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (searchView.onQueryChanged) searchView.onQueryChanged();
        }
    }
}