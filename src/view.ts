import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_CUSTOM_TAGS = "custom-tag-stats-view";

export class CustomTagView extends ItemView {
    // 현재 정렬 상태 저장 (기본값: 빈도순)
    private sortBy: "frequency" | "name" = "frequency";

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() { return VIEW_TYPE_CUSTOM_TAGS; }
    getDisplayText() { return "Custom Tag Stats"; }

    async onOpen() {
        this.render();
        this.registerEvent(
            this.app.metadataCache.on("changed", () => this.render())
        );
    }

    async render() {
        const container = this.containerEl.children[1];
        container.empty();

        // 1. 헤더 및 컨트롤바 영역
        const headerEl = container.createEl("div", { style: "margin-bottom: 20px;" });
        headerEl.createEl("h4", { 
            text: "커스텀 태그 통계", 
            style: "margin-bottom: 12px; color: var(--text-muted); font-size: 0.8em; text-transform: uppercase;" 
        });

        // 정렬 토글 버튼 생성
        const controlsEl = headerEl.createEl("div", { style: "display: flex; gap: 10px; align-items: center;" });
        const sortBtn = controlsEl.createEl("button", {
            text: this.sortBy === "frequency" ? "🔢 빈도순 정렬" : "🔤 이름순 정렬",
            style: "font-size: 0.75em; padding: 2px 8px; cursor: pointer;"
        });

        sortBtn.onclick = () => {
            this.sortBy = this.sortBy === "frequency" ? "name" : "frequency";
            this.render(); // 상태 변경 후 재렌더링
        };

        // 2. 데이터 수집 ($, &, % 모두 포함)
        const listEl = container.createEl("div", { style: "display: flex; flex-wrap: wrap; gap: 8px;" });
        const tagCounts = await this.getTagCounts();
        
        // 정렬 로직 적용
        let sortedTags = Object.entries(tagCounts);
        if (this.sortBy === "frequency") {
            sortedTags.sort((a, b) => b[1] - a[1]); // 빈도 내림차순
        } else {
            sortedTags.sort((a, b) => a[0].localeCompare(b[0])); // 이름 오름차순
        }

        if (sortedTags.length === 0) {
            listEl.createEl("p", { text: "검색된 태그가 없습니다.", style: "color: var(--text-faint);" });
            return;
        }

        // 3. 태그 버튼 생성
        sortedTags.forEach(([tag, count]) => {
            // 접두사에 따른 강조 색상 변경 (선택 사항)
            let accentColor = "var(--text-accent)";
            if (tag.startsWith("&")) accentColor = "#e67e22"; // 주황색 계열
            if (tag.startsWith("%")) accentColor = "#27ae60"; // 녹색 계열

            const tagBtn = listEl.createEl("div", {
                style: `cursor: pointer; background-color: var(--pill-background); border: 1px solid var(--pill-border); 
                        border-radius: var(--pill-radius); padding: 4px 10px; display: flex; align-items: center; 
                        gap: 6px; font-size: var(--font-adaptive-small); transition: all 0.2s ease;`
            });

            tagBtn.createSpan({ text: tag, style: `color: ${accentColor}; font-weight: var(--font-semibold);` });
            tagBtn.createSpan({ text: `${count}`, style: "color: var(--text-muted); font-size: 0.8em; opacity: 0.7;" });

            tagBtn.onmouseenter = () => {
                tagBtn.style.backgroundColor = "var(--background-modifier-hover)";
                tagBtn.style.transform = "translateY(-1px)";
            };
            tagBtn.onmouseleave = () => {
                tagBtn.style.backgroundColor = "var(--pill-background)";
                tagBtn.style.transform = "translateY(0)";
            };

            // 기존의 성공적인 검색 로직 사용
            tagBtn.onclick = async () => {
                await this.app.commands.executeCommandById("global-search:open");
                await new Promise(r => setTimeout(r, 150));
                let searchLeaf = this.app.workspace.getLeavesOfType("search")[0];
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
            };
        });
    }

    // 여러 기호를 수집할 수 있도록 정규표현식 수정
    async getTagCounts(): Promise<Record<string, number>> {
        const files = this.app.vault.getMarkdownFiles();
        const tagCounts: Record<string, number> = {};
        
        // 정규표현식: $, &, % 중 하나로 시작하고 뒤에 마침표(.)와 단어가 오는 패턴
        // 예: $.장소, &.사람, %.작업
        const regex = /[\$\&\%]\.([^\s]+)/gu;

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