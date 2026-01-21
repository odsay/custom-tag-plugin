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
            
            // 상단 헤더 스타일링
            container.createEl("h4", { 
                text: "$. 장소 태그 통계", 
                style: "margin-bottom: 16px; color: var(--text-muted); font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em;" 
            });

            const listEl = container.createEl("div", { 
                style: "display: flex; flex-wrap: wrap; gap: 8px;" // 버튼들이 나란히 배치되도록 설정
            });
            
            const tagCounts = await this.getTagCounts();
            const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

            if (sortedTags.length === 0) {
                listEl.createEl("p", { text: "검색된 태그가 없습니다.", style: "color: var(--text-faint); font-style: italic;" });
                return;
            }

            sortedTags.forEach(([tag, count]) => {
                // 태그 버튼 생성
                const tagBtn = listEl.createEl("div", {
                    style: `
                        cursor: pointer;
                        background-color: var(--pill-background);
                        border: 1px solid var(--pill-border);
                        border-radius: var(--pill-radius);
                        padding: 4px 10px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: var(--font-adaptive-small);
                        transition: all 0.2s ease;
                    `
                });

                // 태그 텍스트 ($.장소)
                tagBtn.createSpan({ 
                    text: tag, 
                    style: "color: var(--text-accent); font-weight: var(--font-semibold);" 
                });

                // 개수 배지 (숫자 부분)
                tagBtn.createSpan({ 
                    text: `${count}`, 
                    style: "color: var(--text-muted); font-size: 0.85em; background: var(--background-secondary); padding: 1px 6px; border-radius: 10px;" 
                });

                // 마우스 상호작용 효과
                tagBtn.onmouseenter = () => {
                    tagBtn.style.backgroundColor = "var(--background-modifier-hover)";
                    tagBtn.style.transform = "translateY(-1px)";
                    tagBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                };
                tagBtn.onmouseleave = () => {
                    tagBtn.style.backgroundColor = "var(--pill-background)";
                    tagBtn.style.transform = "translateY(0)";
                    tagBtn.style.boxShadow = "none";
                };

                // 기존에 만든 성공적인 검색 클릭 로직
                tagBtn.onclick = async () => {
                    await this.app.commands.executeCommandById("global-search:open");
                    await new Promise(resolve => setTimeout(resolve, 150));
                    
                    let searchLeaf = this.app.workspace.getLeavesOfType("search")[0];
                    if (searchLeaf && searchLeaf.view) {
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