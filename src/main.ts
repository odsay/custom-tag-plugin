import { EditorSuggest, Editor, EditorPosition, TFile, EditorSuggestContext, EditorSuggestTriggerInfo, Plugin } from "obsidian";
import { CustomTagView, VIEW_TYPE_CUSTOM_TAGS } from "./view";

// 자동완성 제안 클래스
class CustomTagSuggest extends EditorSuggest<{tag: string, count: number}> {
    plugin: any;

    constructor(app: any, plugin: any) {
        super(app);
        this.plugin = plugin;
    }

    // CustomTagSuggest 클래스 내부 수정
    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const sub = line.substring(0, cursor.ch);
        
        // 마지막에 입력된 "자음." 패턴을 찾습니다.
        const match = sub.match(/([ㄱ-ㅎ]\.)([^\s]*)$/);
        if (match) {
            return {
                start: { line: cursor.line, ch: sub.lastIndexOf(match[1]) },
                end: cursor,
                query: match[1] + match[2] // "ㄱ." + "입력값" 전체를 쿼리로 보냅니다.
            };
        }
        return null;
    }

    async getSuggestions(context: EditorSuggestContext): Promise<{tag: string, count: number}[]> {
        const view = this.app.workspace.getLeavesOfType("custom-tag-stats-view")[0]?.view as any;
        if (!view) return [];

        const tagCounts = await view.getTagCounts();
        const fullQuery = context.query; // 이제 "ㄱ.서" 전체가 들어옵니다.

        return Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count: count as number }))
            // 입력한 자음(ㄱ.)으로 시작하는 것만 1차 필터링 후, 나머지 글자로 2차 필터링
            .filter(item => item.tag.startsWith(fullQuery)) 
            .sort((a, b) => b.count - a.count);
    }

    // 팝업 화면 그리기
    renderSuggestion(item: {tag: string, count: number}, el: HTMLElement): void {
        el.addClass("custom-tag-suggestion-item");
        el.style.display = "flex";
        el.style.justifyContent = "space-between";
        el.style.width = "100%";
        el.style.gap = "20px";

        // 왼쪽: 태그 이름
        el.createSpan({ 
            text: item.tag, 
            style: "color: var(--text-accent); font-weight: 500;" 
        });

        // 오른쪽: 빈도수 배지
        el.createSpan({ 
            text: `${item.count}`, 
            style: "opacity: 0.5; font-size: 0.8em; font-family: var(--font-mono);" 
        });
    }

    selectSuggestion(item: {tag: string, count: number}, evt: MouseEvent | KeyboardEvent): void {
        const { context } = this;
        if (context) {
            context.editor.replaceRange(item.tag, context.start, context.end);
        }
    }
}

export default class CustomTagPlugin extends Plugin {
    async onload() {
        // 1. View 등록
        this.registerView(
            VIEW_TYPE_CUSTOM_TAGS,
            (leaf) => new CustomTagView(leaf)
        );

        // 2. 명령어로 사이드바 열기 추가 (Ctrl + P 메뉴에서 실행 가능)
        this.addCommand({
            id: "show-custom-tag-stats",
            name: "Show Custom Tag Stats",
            callback: () => this.activateView(),
        });

        // 3. 리본 아이콘 추가 (왼쪽 바에 아이콘 클릭 시 사이드바 열림)
        this.addRibbonIcon("hash", "Custom Tag Stats", () => {
            this.activateView();
        });

        // 자동완성 등록
        this.registerEditorSuggest(new CustomTagSuggest(this.app, this));
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(VIEW_TYPE_CUSTOM_TAGS)[0];

        if (!leaf) {
            // 우측 사이드바에 새로운 슬롯(Leaf) 생성
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({
                type: VIEW_TYPE_CUSTOM_TAGS,
                active: true,
            });
        }

        // 해당 View로 포커스 이동
        workspace.revealLeaf(leaf);
    }
}