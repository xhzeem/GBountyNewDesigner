// Helper to parse Payload string: "enabled,value"
function parsePayload(str) {
    const firstComma = str.indexOf(',');
    if (firstComma === -1) return { enabled: true, value: str };
    const enabledStr = str.substring(0, firstComma);
    const value = str.substring(firstComma + 1);
    return {
        enabled: enabledStr === 'true',
        value: value
    };
}

function serializePayload(payload) {
    return `${payload.enabled},${payload.value}`;
}

// Helper to parse Grep string: "enabled,operator,match_type,options,value"
function parseGrep(str) {
    const parts = str.split(',');
    // Manual split to handle potential commas in value
    let idx = 0;
    const indices = [];
    for (let i = 0; i < 4; i++) {
        const nextComma = str.indexOf(',', idx);
        if (nextComma === -1) break;
        indices.push(nextComma);
        idx = nextComma + 1;
    }

    if (indices.length < 4) {
        return { enabled: true, operator: "OR", match_type: "Simple String", options: "", value: str };
    }

    return {
        enabled: str.substring(0, indices[0]) === 'true',
        operator: str.substring(indices[0] + 1, indices[1]),
        match_type: str.substring(indices[1] + 1, indices[2]),
        options: str.substring(indices[2] + 1, indices[3]),
        value: str.substring(indices[3] + 1)
    };
}

function serializeGrep(grep) {
    return `${grep.enabled},${grep.operator},${grep.match_type},${grep.options},${grep.value}`;
}

function parseMatchReplace(obj) {
    if (typeof obj === 'object' && obj !== null) return obj;
    return { type: "Payload", match: "", replace: "", regex: "String" };
}
