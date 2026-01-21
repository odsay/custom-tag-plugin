import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_CUSTOM_TAGS = "custom-tag-stats-view";

export class CustomTagView extends ItemView {
    private sortBy: "frequency" | "name" = "frequency";
    private activeSymbol: "$" | "&" | "%" | "ALL" = "ALL"; // 필터 상태 추가

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() { return VIEW_TYPE_CUSTOM_TAGS; }
    getDisplayText() { return "Custom Tag Stats"; }

    async onOpen() {
        await this.render();
        this.registerEvent(
            this.app.metadataCache.on("changed", () => this.render())
        );
    }

    async render() {
        const container = this.containerEl.children[1] as HTMLElement;
        if (!container) return;
        container.empty();

        // --- 1. 컨트롤 영역 (필터 및 정렬) ---
        const controlsContainer = container.createEl("div", { style: "margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px;" });
        
        // 기호 필터 버튼 그룹
        const filterGroup = controlsContainer.createEl("div", { style: "display: flex; gap: 10px;" });
        const symbols: ("ALL" | "$" | "&" | "%")[] = ["ALL", "$", "&", "%"];
        
        symbols.forEach(sym => {
            const btn = filterGroup.createEl("button", {
                text: sym,
                style: `flex: 1; font-size: 0.7em; padding: 4px; cursor: pointer; 
                        ${this.activeSymbol === sym ? "background-color: var(--text-accent); color: white;" : ""}`
            });
            btn.onclick = () => {
                this.activeSymbol = sym;
                this.render();
            };
        });

        // 정렬 토글 버튼
        const sortBtn = controlsContainer.createEl("button", {
            text: this.sortBy === "frequency" ? "🔢 빈도순 정렬" : "🔤 이름순 정렬",
            style: "width: 100%; font-size: 0.75em; padding: 5px; cursor: pointer;"
        });
        sortBtn.onclick = () => {
            this.sortBy = this.sortBy === "frequency" ? "name" : "frequency";
            this.render();
        };

        // --- 2. 데이터 수집 및 필터링 ---
        const tagCounts = await this.getTagCounts();
        let tagEntries = Object.entries(tagCounts);

        // 기호 필터 적용
        if (this.activeSymbol !== "ALL") {
            tagEntries = tagEntries.filter(([tag]) => tag.startsWith(this.activeSymbol));
        }

        // 정렬 적용
        if (this.sortBy === "frequency") {
            tagEntries.sort((a, b) => b[1] - a[1]);
        } else {
            tagEntries.sort((a, b) => a[0].localeCompare(b[0]));
        }

        // --- 3. 리스트 렌더링 ---
        const listEl = container.createEl("div", { style: "display: flex; flex-wrap: wrap; gap: 8px;" });

        if (tagEntries.length === 0) {
            listEl.createEl("p", { text: "검색된 태그가 없습니다.", style: "color: var(--text-faint); font-size: 0.8em;" });
            return;
        }

        tagEntries.forEach(([tag, count]) => {
            const tagBtn = listEl.createEl("div", {
                style: "cursor: pointer; background: var(--pill-background); border: 1px solid var(--pill-border); border-radius: var(--pill-radius); padding: 4px 10px; display: flex; align-items: center; gap: 6px; font-size: 0.85em;"
            });

            let color = "var(--text-accent)";
            if (tag.startsWith("&")) color = "#e67e22";
            if (tag.startsWith("%")) color = "#27ae60";

            tagBtn.createSpan({ text: tag, style: `color: ${color}; font-weight: bold;` });
            tagBtn.createSpan({ text: `${count}`, style: "opacity: 0.6; font-size: 0.8em;" });

            tagBtn.onclick = () => this.executeSearch(tag);
        });
    }

    async getTagCounts(): Promise<Record<string, number>> {
        const files = this.app.vault.getMarkdownFiles();
        const tagCounts: Record<string, number> = {};
        const regex = /([\$&%])\.([^\s]+)/gu; // 지난번 수정한 안전한 정규표현식

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