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
            li.onclick = async () => {
                const query = `"${tag}"`;

                // 1. 검색 창 강제 활성화 (이미 열려있으면 포커스, 없으면 생성)
                await this.app.commands.executeCommandById("global-search:open");

                // 2. 검색 뷰가 준비될 때까지 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 150));

                // 3. Workspace 전체에서 검색 뷰(Leaf)를 직접 탐색
                let searchLeaf = this.app.workspace.getLeavesOfType("search")[0];
                
                if (!searchLeaf) {
                    // 만약 그래도 없다면, 한 번 더 시도 (모바일이나 느린 PC 대응)
                    await this.app.commands.executeCommandById("global-search:open");
                    searchLeaf = this.app.workspace.getLeavesOfType("search")[0];
                }

                if (searchLeaf && searchLeaf.view) {
                    const searchView = searchLeaf.view as any;

                    // 4. 검색 결과창으로 시점 전환
                    this.app.workspace.revealLeaf(searchLeaf);

                    // 5. 검색어 주입 및 실행 (가장 확실한 방법 조합)
                    try {
                        // 방법 1: 직접 Query 설정
                        if (searchView.setQuery) {
                            searchView.setQuery(query);
                        }

                        // 방법 2: DOM Input 요소에 강제 주입 (UI 갱신용)
                        const inputEl = searchView.searchComponent?.inputEl || 
                                        searchView.containerEl.querySelector("input");
                        
                        if (inputEl) {
                            inputEl.value = query;
                            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                            inputEl.focus();
                        }

                        // 방법 3: 검색 실행 트리거 호출
                        if (searchView.onQueryChanged) {
                            searchView.onQueryChanged();
                        } else if (searchView.startSearch) {
                            searchView.startSearch();
                        }
                    } catch (e) {
                        console.error("검색어 주입 중 에러 발생:", e);
                    }
                } else {
                    new Notice("검색창을 활성화할 수 없습니다. 핵심 플러그인의 'Search'가 켜져 있는지 확인하세요.");
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