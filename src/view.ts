import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_CUSTOM_TAGS = "custom-tag-stats-view";

export class CustomTagView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_CUSTOM_TAGS;
    }

    getDisplayText() {
        return "Custom Tag Stats";
    }

    async onOpen() {
        // 1. 초기 렌더링
        this.render();

        // 2. 실시간 업데이트 이벤트 등록
        // 문서 내용이 변경될 때마다(파일 저장 등) 화면을 다시 그립니다.
        this.registerEvent(
            this.app.metadataCache.on("changed", () => {
                this.render();
            })
        );

        // 파일이 삭제되거나 이름이 바뀔 때도 갱신하고 싶다면 아래 주석을 해제하세요.
        /*
        this.registerEvent(this.app.vault.on("delete", () => this.render()));
        this.registerEvent(this.app.vault.on("rename", () => this.render()));
        */
    }

    // 화면을 그리는 메인 함수
    async render() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h4", { text: "$. 태그 통계 (실시간)" });

        const listEl = container.createEl("div", { cls: "custom-tag-list" });
        
        // 데이터 수집
        const tagCounts = await this.getTagCounts();
        const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

        if (sortedTags.length === 0) {
            listEl.createEl("p", { text: "검색된 태그가 없습니다.", style: "color: gray; font-size: 0.9em;" });
            return;
        }

        const ul = listEl.createEl("ul", { style: "list-style: none; padding: 0;" });
        
        sortedTags.forEach(([tag, count]) => {
            const li = ul.createEl("li", { 
                style: "cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" 
            });
            
            // 호버 효과 (CSS 없이 Vanilla JS로 간단히 처리)
            li.onmouseenter = () => li.style.backgroundColor = "var(--background-modifier-hover)";
            li.onmouseleave = () => li.style.backgroundColor = "transparent";

            li.createEl("b", { text: tag, style: "color: var(--text-accent);" });
            li.createSpan({ text: ` (${count})`, style: "font-size: 0.85em; opacity: 0.7;" });
            
            // --- 클릭 기능 추가: 왼쪽 사이드바 검색창 연동 ---
            li.onclick = () => {
                const searchPlugin = (this.app as any).internalPlugins.getPluginById("global-search");
                if (searchPlugin && searchPlugin.instance) {
                    // 검색 결과창 열기 및 검색어 입력
                    searchPlugin.instance.openSearch(`"${tag}"`);
                } else {
                    // 대체 방법: 명령어를 통한 검색창 열기 (플러그인 접근이 막힌 경우)
                    this.app.commands.executeCommandById("global-search:open");
                }
            };
        });
    }

    // 태그를 추출하는 로직 분리
    async getTagCounts(): Promise<Record<string, number>> {
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
        return tagCounts;
    }
}