import { ItemView, WorkspaceLeaf, Notice } from "obsidian";

export const VIEW_TYPE_CUSTOM_TAGS = "custom-tag-stats-view";

export class CustomTagView extends ItemView {
    private sortBy: "frequency" | "name" = "frequency";

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

        // 1. 헤더 영역
        const headerEl = container.createEl("div", { style: "margin-bottom: 20px;" });
        headerEl.createEl("h4", { text: "커스텀 태그 통계", style: "margin-bottom: 12px; font-size: 0.8em; color: var(--text-muted);" });

        // 정렬 버튼
        const sortBtn = headerEl.createEl("button", {
            text: this.sortBy === "frequency" ? "🔢 빈도순" : "🔤 이름순",
            style: "font-size: 0.7em; cursor: pointer;"
        });
        sortBtn.onclick = () => {
            this.sortBy = this.sortBy === "frequency" ? "name" : "frequency";
            this.render();
        };

        // 2. 데이터 수집 및 정렬
        const listEl = container.createEl("div", { style: "display: flex; flex-wrap: wrap; gap: 8px;" });
        const tagCounts = await this.getTagCounts();
        let sortedTags = Object.entries(tagCounts);

        if (this.sortBy === "frequency") {
            sortedTags.sort((a, b) => b[1] - a[1]);
        } else {
            sortedTags.sort((a, b) => a[0].localeCompare(b[0]));
        }

        if (sortedTags.length === 0) {
            listEl.createEl("p", { text: "태그가 없습니다.", style: "color: var(--text-faint);" });
            return;
        }

        // 3. 태그 버튼 생성
        sortedTags.forEach(([tag, count]) => {
            const tagBtn = listEl.createEl("div", {
                style: "cursor: pointer; background: var(--pill-background); border: 1px solid var(--pill-border); border-radius: var(--pill-radius); padding: 4px 10px; display: flex; align-items: center; gap: 6px; font-size: 0.85em;"
            });

            // 기호별 색상 ($, &, % 구분)
            let color = "var(--text-accent)";
            if (tag.startsWith("&")) color = "#e67e22";
            if (tag.startsWith("%")) color = "#27ae60";

            tagBtn.createSpan({ text: tag, style: `color: ${color}; font-weight: bold;` });
            tagBtn.createSpan({ text: `${count}`, style: "opacity: 0.6; font-size: 0.8em;" });

            tagBtn.onclick = async () => {
                await this.executeSearch(tag);
            };
        });
    }

    // 검색 로직 분리 (가독성 및 에러 방지)
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

    async getTagCounts(): Promise<Record<string, number>> {
        const files = this.app.vault.getMarkdownFiles();
        const tagCounts: Record<string, number> = {};
        
        // 수정된 정규표현식: 
        // $는 특수문자라 \$로 쓰고, &와 %는 그냥 씁니다. 
        // 마침표(.)도 특수문자라 \.으로 씁니다.
        const regex = /([\$&%])\.([^\s]+)/gu;

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
}