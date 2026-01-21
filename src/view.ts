import { ItemView, WorkspaceLeaf } from "obsidian";

// 고유한 View의 ID를 정의합니다.
export const VIEW_TYPE_CUSTOM_TAGS = "custom-tag-stats-view";

export class CustomTagView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    // Obsidian 내에서 이 View를 식별하는 이름
    getViewType() {
        return VIEW_TYPE_CUSTOM_TAGS;
    }

    // 사이드바 상단에 표시될 이름
    getDisplayText() {
        return "Custom Tag Stats";
    }

    // 화면이 열릴 때 실행되는 함수
    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h4", { text: "$. 태그 통계" });

        // 데이터를 담을 리스트 생성
        const listEl = container.createEl("div", { cls: "custom-tag-list" });
        
        // 실제 데이터 계산 및 화면 표시
        await this.updateStats(listEl);
    }

    // 데이터를 스캔하고 화면을 갱신하는 로직
    async updateStats(container: HTMLElement) {
        container.empty();
        
        const files = this.app.vault.getMarkdownFiles();
        const tagCounts: Record<string, number> = {};
        const regex = /\$\.([^\s]+)/gu;

        for (const file of files) {
            const content = await this.app.vault.cachedRead(file);
            let match;
            while ((match = regex.exec(content)) !== null) {
                const tagName = match[0];
                tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            }
        }

        // 결과 출력
        const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

        if (sortedTags.length === 0) {
            container.createEl("p", { text: "검색된 태그가 없습니다.", cls: "ins-empty" });
            return;
        }

        const ul = container.createEl("ul");
        sortedTags.forEach(([tag, count]) => {
            const li = ul.createEl("li");
            li.createEl("b", { text: tag });
            li.createSpan({ text: ` : ${count}회` });
            
            // 클릭하면 해당 태그 검색창으로 연결하는 기능 (옵션)
            li.style.cursor = "pointer";
            li.onclick = () => {
                (this.app as any).internalPlugins.getPluginById("global-search").instance.openSearch(`"${tag}"`);
            };
        });
    }
}