import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_CUSTOM_TAGS = "custom-tag-stats-view";

export class CustomTagView extends ItemView {
    private sortBy: "frequency" | "name" = "frequency";
    private activeSymbol: "ㄱ" | "ㄴ" | "ㄷ" | "ㄹ" | "ㅁ" | "ㅂ" | "ㅅ" | "ㅇ" | "ㅈ" | "ㅊ" | "ㅋ" | "ㅌ" | "ㅍ" | "ㅎ" | "ALL" = "ALL"; // 필터 상태 추가

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
        container.style.padding = "0px"; // 패딩 최소화
        container.style.overflowX = "hidden"; // 가로 스크롤 방지
        if (!container) return;
        container.empty();

        // 사이드바 너비를 강제로 100%로 고정
        container.style.width = "100%"; 
        container.style.minWidth = "100%";
        container.style.display = "block";

        // --- 1. 컨트롤 영역 ---
        const controlsContainer = container.createEl("div", { 
            style: "margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px; width: 100%;" 
        });
        
        const filterGroup = controlsContainer.createEl("div", { 
            style: "display: flex; gap: 4px; flex-wrap: wrap; width: 100%;" 
        });
        
        const symbols: ("ALL" | "ㄱ" | "ㄴ" | "ㄷ" | "ㄹ" | "ㅁ" | "ㅂ" | "ㅅ" | "ㅇ" | "ㅈ" | "ㅊ" | "ㅋ" | "ㅌ" | "ㅍ" | "ㅎ")[] = ["ALL", "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ" , "ㅂ" , "ㅅ" , "ㅇ" , "ㅈ" , "ㅊ" , "ㅋ" , "ㅌ" , "ㅍ" , "ㅎ"];
        
        symbols.forEach(sym => {
            const btn = filterGroup.createEl("button", {
                text: sym,
                style: `font-size: 0.7em; padding: 2px 6px; cursor: pointer; min-width: 30px;
                        ${this.activeSymbol === sym ? "background-color: var(--text-accent); color: white;" : ""}`
            });
            btn.onclick = () => {
                this.activeSymbol = sym;
                this.render();
            };
        });

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

        if (this.activeSymbol !== "ALL") {
            tagEntries = tagEntries.filter(([tag]) => tag.startsWith(this.activeSymbol));
        }

        if (this.sortBy === "frequency") {
            tagEntries.sort((a, b) => b[1] - a[1]);
        } else {
            tagEntries.sort((a, b) => a[0].localeCompare(b[0]));
        }

        // --- 3. 리스트 렌더링 ---
        // [수정] listEl이 가로를 무조건 꽉 채우도록 display: flex 사용
        // listEl이 자식들을 아래로 떨어뜨리지 못하게 강제함
        const listEl = container.createEl("div", { 
            style: "display: flex; flex-direction: column; width: 100%; align-items: stretch;" 
        });

        if (tagEntries.length === 0) {
            listEl.createEl("p", { text: "검색된 태그가 없습니다.", style: "color: var(--text-faint); font-size: 0.8em;" });
            return;
        }

        tagEntries.forEach(([tag, count]) => {
            // 1. 버튼 역할을 할 div (기존 스타일 유지)
            const tagBtn = listEl.createEl("div", {
                style: `
                    cursor: pointer; 
                    background: var(--pill-background); 
                    border: 1px solid var(--pill-border); 
                    border-radius: var(--pill-radius); 
                    padding: 4px 8px; 
                    margin-bottom: 4px;
                    width: 100%;
                    box-sizing: border-box;
                `
            });

            // 2. 물리적으로 좌우를 나눌 테이블 생성 (가장 확실한 방법)
            const table = tagBtn.createEl("table", { 
                style: "width: 100%; border-collapse: collapse; table-layout: fixed;" 
            });
            const tr = table.createEl("tr");

            let color = "var(--text-accent)";
            if (tag.startsWith("ㄴ")) color = "#e67e22";
            if (tag.startsWith("ㄷ")) color = "#27ae60";

            // 왼쪽 칸: 태그 이름
            const tdName = tr.createEl("td", {
                style: `
                    text-align: left;
                    vertical-align: middle;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    color: ${color};
                    font-weight: 600;
                    font-size: 0.9em;
                `
            });
            tdName.setText(tag);

            // 오른쪽 칸: 숫자 (너비를 최소한으로 잡고 우측 정렬)
            const tdCount = tr.createEl("td", {
                style: `
                    text-align: right;
                    vertical-align: middle;
                    width: 40px; /* 숫자 영역 너비 고정 */
                `
            });
            
            tdCount.createSpan({
                text: `${count}`,
                style: `
                    color: var(--text-muted);
                    background-color: var(--background-secondary-alt);
                    padding: 1px 6px;
                    border-radius: 8px;
                    font-size: 0.75em;
                    display: inline-block;
                `
            });

            tagBtn.onclick = () => this.executeSearch(tag);
        });
    }

    
    async getTagCounts(): Promise<Record<string, number>> {
        const files = this.app.vault.getMarkdownFiles();
        const tagCounts: Record<string, number> = {};
        const regex = /([ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ])\.([^\s]+)/gu; // 지난번 수정한 안전한 정규표현식

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