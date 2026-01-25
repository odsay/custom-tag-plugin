import * as React from "react";

interface TagStatsProps {
    tagCounts: Record<string, number>;
    activeSymbol: string;
    sortBy: "frequency" | "name";
    onSymbolChange: (sym: string) => void;
    onSortChange: () => void;
    onTagClick: (tag: string) => void;
}

export const TagStatsComponent = ({ 
    tagCounts, activeSymbol, sortBy, onSymbolChange, onSortChange, onTagClick 
}: TagStatsProps) => {
    
    const symbols = ["ALL", "ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ" , "ㅂ" , "ㅅ" , "ㅇ" , "ㅈ" , "ㅊ" , "ㅋ" , "ㅌ" , "ㅍ" , "ㅎ"];
    
    let tagEntries = Object.entries(tagCounts);
    if (activeSymbol !== "ALL") {
        tagEntries = tagEntries.filter(([tag]) => tag.startsWith(activeSymbol));
    }

    tagEntries.sort((a, b) => 
        sortBy === "frequency" ? b[1] - a[1] : a[0].localeCompare(b[0])
    );

    return (
        <div style={{ padding: "10px", width: "100%" }}>
            {/* 필터 버튼 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                {symbols.map(sym => (
                    <button 
                        key={sym}
                        onClick={() => onSymbolChange(sym)}
                        style={{
                            fontSize: "0.7em", padding: "2px 6px", cursor: "pointer",
                            backgroundColor: activeSymbol === sym ? "var(--text-accent)" : "var(--interactive-normal)",
                            color: activeSymbol === sym ? "white" : "var(--text-normal)"
                        }}
                    >
                        {sym}
                    </button>
                ))}
            </div>

            {/* 정렬 버튼 */}
            <button 
                onClick={onSortChange}
                style={{ width: "100%", fontSize: "0.8em", marginBottom: "15px", cursor: "pointer" }}
            >
                {sortBy === "frequency" ? "🔢 빈도순" : "🔤 이름순"}
            </button>

            {/* 태그 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {tagEntries.map(([tag, count]) => {
                    let color = "var(--text-accent)";
                    if (tag.startsWith("ㄴ")) color = "#e67e22";
                    if (tag.startsWith("ㄷ")) color = "#27ae60";

                    return (
                        <div 
                            key={tag}
                            onClick={() => onTagClick(tag)}
                            style={{
                                display: "flex",
                                justifyContent: "space-between", // 좌우 끝으로 밀기
                                alignItems: "center",
                                padding: "0px 6px",
                                background: "var(--pill-background)",
                                border: "1px solid var(--pill-border)",
                                borderRadius: "var(--pill-radius)",
                                cursor: "pointer"
                            }}
                        >
                            <span style={{ color, fontWeight: 300, fontSize: "0.9em" }}>{tag}</span>
                            <span style={{
                                color: "var(--text-muted)",
                                backgroundColor: "var(--background-secondary-alt)",
                                padding: "2px 4px",
                                borderRadius: "10px",
                                fontSize: "0.75em",
                                fontWeight: "none"
                            }}>{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};