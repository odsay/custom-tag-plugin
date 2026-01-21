import { Plugin } from "obsidian";
import { CustomTagView, VIEW_TYPE_CUSTOM_TAGS } from "./view";

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