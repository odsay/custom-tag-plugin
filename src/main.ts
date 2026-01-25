import { EditorSuggest, Editor, EditorPosition, TFile, EditorSuggestContext, EditorSuggestTriggerInfo, Plugin } from "obsidian";
import * as cmView from "@codemirror/view";
import * as cmState from "@codemirror/state";
import { CustomTagView, VIEW_TYPE_CUSTOM_TAGS } from "./view";

// 1. 자동완성 제안 클래스
class CustomTagSuggest extends EditorSuggest<{tag: string, count: number}> {
    constructor(app: any) { super(app); }
    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const sub = line.substring(0, cursor.ch);
        const match = sub.match(/([ㄱ-ㅎ]\.)([^\s]*)$/);
        if (match) return { start: { line: cursor.line, ch: sub.lastIndexOf(match[1]) }, end: cursor, query: match[1] + match[2] };
        return null;
    }
    async getSuggestions(context: EditorSuggestContext) {
        const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_CUSTOM_TAGS)[0]?.view as any;
        if (!view) return [];
        const tagCounts = await view.getTagCounts();
        return Object.entries(tagCounts).map(([tag, count]) => ({ tag, count: count as number }))
            .filter(item => item.tag.startsWith(context.query)).sort((a, b) => b.count - a.count);
    }
    renderSuggestion(item: any, el: HTMLElement) {
        el.addClass("custom-tag-suggestion-item");
        el.createSpan({ text: item.tag, style: "color: var(--text-accent); font-weight: 500;" });
    }
    selectSuggestion(item: any) { if (this.context) this.context.editor.replaceRange(item.tag, this.context.start, this.context.end); }
}

// 2. 메인 플러그인 클래스
export default class CustomTagPlugin extends Plugin {
    async onload() {
        console.log("Custom Tag Plugin Loading...");

        this.registerView(VIEW_TYPE_CUSTOM_TAGS, (leaf) => new CustomTagView(leaf));
        this.registerEditorSuggest(new CustomTagSuggest(this.app));

        // --- 편집 모드 스타일링 (StateField) ---
        const self = this;
        const customTagField = cmState.StateField.define<cmView.DecorationSet>({
            create(state) {
                return self.buildDecorations(state);
            },
            update(oldState, transaction) {
                if (transaction.docChanged) return self.buildDecorations(transaction.state);
                return oldState.map(transaction.changes);
            },
            provide(field) {
                return cmView.EditorView.decorations.from(field);
            }
        });

        this.registerEditorExtension(customTagField);

        // --- 읽기 모드 스타일링 ---
        this.registerMarkdownPostProcessor((element) => {
            const regex = /([ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ])\.([^\s\n\r]+)/gu;
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode() as Text) {
                if (regex.test(node.textContent || "")) {
                    const span = document.createElement("span");
                    span.innerHTML = node.textContent!.replace(regex, (match, p1) => {
                        let color = "var(--text-accent)";
                        if (p1 === "ㄱ") color = "#27ae60";
                        else if (p1 === "ㄴ") color = "#e67e22";
                        return `<span style="color: ${color}; background-color: ${color}22; padding: 0px 4px; border-radius: 4px; font-weight: 400;">${match}</span>`;
                    });
                    node.parentElement?.replaceChild(span, node);
                }
            }
        });

        this.addRibbonIcon("hash", "Custom Tag Stats", () => this.activateView());
    }

    // 데코레이션 생성 핵심 로직
    buildDecorations(state: cmState.EditorState): cmView.DecorationSet {
        // [중요 수정] RangeSetBuilder는 최신 버전에서 cmState에 있습니다.
        const RangeSetBuilderClass = (cmState as any).RangeSetBuilder || (cmView as any).RangeSetBuilder;
        const builder = new RangeSetBuilderClass();
        
        const regex = /([ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ])\.([^\s\n\r]+)/gu;
        const text = state.doc.toString();
        let match;

        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            const consonant = match[1];

            let color = "var(--text-accent)";
            if (consonant === "ㄱ") color = "#27ae60";
            else if (consonant === "ㄴ") color = "#e67e22";

            builder.add(start, end, cmView.Decoration.mark({
                attributes: { 
                    style: `background-color: ${color}22; color: ${color}; border-radius: 4px; padding: 0px 4px; font-weight: 400;` 
                }
            }));
        }
        return builder.finish();
    }

    async activateView() {
        let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CUSTOM_TAGS)[0];
        if (!leaf) {
            leaf = this.app.workspace.getRightLeaf(false);
            await leaf.setViewState({ type: VIEW_TYPE_CUSTOM_TAGS, active: true });
        }
        this.app.workspace.revealLeaf(leaf);
    }
}