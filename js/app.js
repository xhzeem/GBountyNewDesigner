// Schema Definitions
const defaultProfile = {
    "profile_name": "New Profile",
    "enabled": true,
    "scanner": "active",
    "author": "",
    "steps": [
        {
            "request_type": "Original Request",
            "reuse_cookie": false,
            "insertion_point": "Same insertion point than the previous request",
            "raw_request": "",
            "payloads": [],
            "payloads_file": "",
            "payload_position": "Replace",
            "change_http_request": false,
            "change_http_request_type": "POST to GET",
            "insertion_points": ["All"],
            "header_value": false,
            "new_headers": [],
            "match_replace": [],
            "encoder": [],
            "url_encode": true,
            "chars_to_url_encode": "&",
            "greps_file": "",
            "grep": [],
            "redir_type": "Never",
            "max_redir": 5,
            "show_alert": "Show all issues of this type per domain",
            "issue_name": "New Issue",
            "issue_severity": "High",
            "issue_confidence": "Certain",
            "issue_detail": "",
            "remediation_detail": "",
            "issue_background": "",
            "remediation_background": ""
        }
    ],
    "Tags": []
};

const scannerTypes = ["active", "passive_request", "passive_response"];
const severities = ["High", "Medium", "Low", "Information"];
const confidences = ["Certain", "Firm", "Tentative"];
const insertionPoints = [
    "All",
    "Param body value",
    "Param body name",
    "Param url value",
    "Entire body",
    "Param url name",
    "Param json value",
    "Param cookie name",
    "Param cookie value",
    "Param json name",
    "Entire body json",
    "User provided",
    "Param xml value",
    "Param xml name",
    "Param xml attr value",
    "Param xml attr name",
    "Param multipart attr value",
    "Param multipart attr name",
    "Entire body xml",
    "Url path filename",
    "Url path folder",
    "Entire body multipart",
    "Multiple Path discovery",
    "Single Path discovery"
];

const payloadPositions = ["Replace", "Append", "Insert"];
const changeHttpMethods = ["POST to GET", "GET to POST", "GET <-> POST"];
const matchReplaceTypes = ["Payload", "Request"];
const matchReplaceRegexTypes = ["String", "Regex"];
const payloadEncoders = [
    "URL-encode key characters",
    "URL-encode all characters",
    "URL-encode all characters (Unicode)",
    "HTML-encode key characters",
    "HTML-encode all characters",
    "Base64-encode"
];
const showIssueOptions = [
    "Show all issues of this type per domain",
    "Show only one issue of this type per domain",
    "Not show this issue"
];
const redirTypes = ["Never", "On-site only", "In-scope only", "Always"];

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

// App Logic
class App {
    constructor() {
        this.profile = JSON.parse(JSON.stringify(defaultProfile));
        this.jsonEditor = document.getElementById('json-editor');
        this.stepsContainer = document.getElementById('steps-container');

        this.init();
    }

    init() {
        this.bindGlobalEvents();
        this.renderForm();
        this.updateJsonView();
    }

    bindGlobalEvents() {
        // JSON Editor changes
        this.jsonEditor.addEventListener('input', () => {
            try {
                const newProfile = JSON.parse(this.jsonEditor.value);
                this.profile = newProfile;
                this.renderForm();
            } catch (e) {
                // Invalid JSON
            }
        });

        // Global Inputs
        document.querySelectorAll('[data-path]').forEach(input => {
            input.addEventListener('input', (e) => {
                const path = e.target.dataset.path;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                this.profile[path] = value;
                this.updateJsonView();
            });
        });

        // Main Tabs
        document.querySelectorAll('.main-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.target).classList.add('active');
            });
        });

        // Tags Management
        this.bindTagsEvents();

        // Buttons
        document.getElementById('btn-new').addEventListener('click', () => {
            if (confirm('Discard current changes?')) {
                this.profile = JSON.parse(JSON.stringify(defaultProfile));
                this.renderForm();
                this.updateJsonView();
            }
        });

        document.getElementById('btn-download').addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.profile, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", (this.profile.profile_name || "profile") + ".bb2");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });

        document.getElementById('btn-copy').addEventListener('click', () => {
            this.jsonEditor.select();
            document.execCommand('copy');
            alert('Copied to clipboard!');
        });

        document.getElementById('btn-add-step').addEventListener('click', () => {
            const newStep = JSON.parse(JSON.stringify(defaultProfile.steps[0]));
            this.profile.steps.push(newStep);
            this.renderSteps();
            this.updateJsonView();
        });
    }

    bindTagsEvents() {
        const input = document.getElementById('new-tag-input');
        const addBtn = document.getElementById('btn-add-tag');
        const removeBtn = document.getElementById('btn-remove-tag');
        const select = document.getElementById('tags-select');

        addBtn.addEventListener('click', () => {
            const tag = input.value.trim();
            if (tag && !this.profile.Tags.includes(tag)) {
                this.profile.Tags.push(tag);
                this.renderTags();
                this.updateJsonView();
                input.value = '';
            }
        });

        removeBtn.addEventListener('click', () => {
            const selected = Array.from(select.selectedOptions).map(opt => opt.value);
            this.profile.Tags = this.profile.Tags.filter(t => !selected.includes(t));
            this.renderTags();
            this.updateJsonView();
        });

        select.addEventListener('change', () => {
            removeBtn.disabled = select.selectedOptions.length === 0;
        });
    }

    updateJsonView() {
        this.jsonEditor.value = JSON.stringify(this.profile, null, 2);
    }

    renderForm() {
        document.getElementById('profile_name').value = this.profile.profile_name || '';
        document.getElementById('author').value = this.profile.author || '';
        document.getElementById('scanner').value = this.profile.scanner || 'active';
        document.getElementById('enabled').checked = this.profile.enabled !== false;

        this.renderTags();
        this.renderSteps();
    }

    renderTags() {
        const select = document.getElementById('tags-select');
        select.innerHTML = '';
        (this.profile.Tags || []).forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            select.appendChild(opt);
        });
    }

    renderSteps() {
        this.stepsContainer.innerHTML = '';
        (this.profile.steps || []).forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step-container';

            // Use template from templates.js
            stepEl.innerHTML = getStepTemplate(step, index);

            // Bind Events
            this.bindStepEvents(stepEl, index, step);
            this.renderPayloadsTable(stepEl, index, step);
            this.renderGrepsTable(stepEl, index, step);
            this.renderMatchReplaceTable(stepEl, index, step);
            this.renderEncodersList(stepEl, index, step);
            this.renderHeadersTable(stepEl, index, step);

            this.stepsContainer.appendChild(stepEl);
        });

        // Remove Step Buttons
        document.querySelectorAll('.btn-remove-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                this.profile.steps.splice(idx, 1);
                this.renderSteps();
                this.updateJsonView();
            });
        });
    }

    bindStepEvents(stepEl, index, step) {
        // Inner Tabs
        stepEl.querySelectorAll('.inner-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                stepEl.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.remove('active'));
                stepEl.querySelectorAll('.inner-tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                stepEl.querySelector(`#${e.target.dataset.tab}`).classList.add('active');
            });
        });

        // Inputs
        stepEl.querySelectorAll('.step-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.field;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                this.profile.steps[index][field] = value;

                // Handle Change HTTP Method dependency
                if (field === 'change_http_request') {
                    this.renderSteps(); // Re-render to enable/disable dependent field
                } else {
                    this.updateJsonView();
                }
            });
        });

        // Insertion Points
        stepEl.querySelectorAll('.ip-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const val = e.target.value;
                if (e.target.checked) {
                    if (!this.profile.steps[index].insertion_points.includes(val)) {
                        this.profile.steps[index].insertion_points.push(val);
                    }
                } else {
                    this.profile.steps[index].insertion_points = this.profile.steps[index].insertion_points.filter(x => x !== val);
                }
                this.updateJsonView();
            });
        });

        // Redirection Radio
        stepEl.querySelectorAll('.redir-radio').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.profile.steps[index].redir_type = e.target.value;
                    this.updateJsonView();
                }
            });
        });

        // Add Payload
        stepEl.querySelector('.btn-add-payload').addEventListener('click', () => {
            this.profile.steps[index].payloads.push("true,");
            this.renderSteps();
            this.updateJsonView();
        });

        // Clear Payloads
        stepEl.querySelector('.btn-clear-payloads').addEventListener('click', () => {
            this.profile.steps[index].payloads = [];
            this.renderSteps();
            this.updateJsonView();
        });

        // Add Grep
        stepEl.querySelector('.btn-add-grep').addEventListener('click', () => {
            this.profile.steps[index].grep.push("true,OR,Simple String,,");
            this.renderSteps();
            this.updateJsonView();
        });

        // Clear Greps
        stepEl.querySelector('.btn-clear-greps').addEventListener('click', () => {
            this.profile.steps[index].grep = [];
            this.renderSteps();
            this.updateJsonView();
        });

        // Add Match Replace
        stepEl.querySelector('.btn-add-match-replace').addEventListener('click', () => {
            this.profile.steps[index].match_replace.push({ type: "Payload", match: "", replace: "", regex: "String" });
            this.renderSteps();
            this.updateJsonView();
        });

        // Add Encoder
        stepEl.querySelector('.btn-add-encoder').addEventListener('click', () => {
            const select = stepEl.querySelector('.encoder-select');
            const val = select.value;
            this.profile.steps[index].encoder.push(val);
            this.renderSteps();
            this.updateJsonView();
        });

        // Add Header
        stepEl.querySelector('.btn-add-header').addEventListener('click', () => {
            this.profile.steps[index].new_headers.push("");
            this.renderSteps();
            this.updateJsonView();
        });
    }

    renderPayloadsTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#payloads-table-${stepIndex} tbody`);
        (step.payloads || []).forEach((pStr, pIndex) => {
            const payload = parsePayload(pStr);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center"><input type="checkbox" class="payload-enable" ${payload.enabled ? 'checked' : ''}></td>
                <td><input type="text" class="payload-value" value="${payload.value}" style="border:none; background:transparent; width:100%"></td>
                <td style="text-align: center"><button class="btn small danger remove-payload">×</button></td>
            `;

            const updatePayload = () => {
                const enabled = tr.querySelector('.payload-enable').checked;
                const value = tr.querySelector('.payload-value').value;
                this.profile.steps[stepIndex].payloads[pIndex] = serializePayload({ enabled, value });
                this.updateJsonView();
            };

            tr.querySelector('.payload-enable').addEventListener('change', updatePayload);
            tr.querySelector('.payload-value').addEventListener('input', updatePayload);
            tr.querySelector('.remove-payload').addEventListener('click', () => {
                this.profile.steps[stepIndex].payloads.splice(pIndex, 1);
                this.renderSteps();
                this.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    renderGrepsTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#greps-table-${stepIndex} tbody`);
        (step.grep || []).forEach((gStr, gIndex) => {
            const grep = parseGrep(gStr);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center"><input type="checkbox" class="grep-enable" ${grep.enabled ? 'checked' : ''}></td>
                <td>
                    <select class="grep-operator" style="border:none; background:transparent; width:100%">
                        <option value="OR" ${grep.operator === 'OR' ? 'selected' : ''}>OR</option>
                        <option value="AND" ${grep.operator === 'AND' ? 'selected' : ''}>AND</option>
                        <option value="OR NOT" ${grep.operator === 'OR NOT' ? 'selected' : ''}>OR NOT</option>
                        <option value="AND NOT" ${grep.operator === 'AND NOT' ? 'selected' : ''}>AND NOT</option>
                    </select>
                </td>
                <td>
                    <select class="grep-match-type" style="border:none; background:transparent; width:100%">
                        <option value="Simple String" ${grep.match_type === 'Simple String' ? 'selected' : ''}>Simple String</option>
                        <option value="Regex" ${grep.match_type === 'Regex' ? 'selected' : ''}>Regex</option>
                        <option value="Blind Host" ${grep.match_type === 'Blind Host' ? 'selected' : ''}>Blind Host</option>
                        <option value="Status Code" ${grep.match_type === 'Status Code' ? 'selected' : ''}>Status Code</option>
                        <option value="Time Delay" ${grep.match_type === 'Time Delay' ? 'selected' : ''}>Time Delay</option>
                        <option value="Content Type" ${grep.match_type === 'Content Type' ? 'selected' : ''}>Content Type</option>
                        <option value="Content Length" ${grep.match_type === 'Content Length' ? 'selected' : ''}>Content Length</option>
                        <option value="Content Length Diff" ${grep.match_type === 'Content Length Diff' ? 'selected' : ''}>Content Length Diff</option>
                        <option value="URL Extension" ${grep.match_type === 'URL Extension' ? 'selected' : ''}>URL Extension</option>
                    </select>
                </td>
                <td><input type="text" class="grep-options" value="${grep.options}" style="border:none; background:transparent; width:100%"></td>
                <td><input type="text" class="grep-value" value="${grep.value}" style="border:none; background:transparent; width:100%"></td>
                <td style="text-align: center"><button class="btn small danger remove-grep">×</button></td>
            `;

            const updateGrep = () => {
                const enabled = tr.querySelector('.grep-enable').checked;
                const operator = tr.querySelector('.grep-operator').value;
                const match_type = tr.querySelector('.grep-match-type').value;
                const options = tr.querySelector('.grep-options').value;
                const value = tr.querySelector('.grep-value').value;
                this.profile.steps[stepIndex].grep[gIndex] = serializeGrep({ enabled, operator, match_type, options, value });
                this.updateJsonView();
            };

            tr.querySelector('.grep-enable').addEventListener('change', updateGrep);
            tr.querySelector('.grep-operator').addEventListener('change', updateGrep);
            tr.querySelector('.grep-match-type').addEventListener('change', updateGrep);
            tr.querySelector('.grep-options').addEventListener('input', updateGrep);
            tr.querySelector('.grep-value').addEventListener('input', updateGrep);

            tr.querySelector('.remove-grep').addEventListener('click', () => {
                this.profile.steps[stepIndex].grep.splice(gIndex, 1);
                this.renderSteps();
                this.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    renderMatchReplaceTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#match-replace-table-${stepIndex} tbody`);
        (step.match_replace || []).forEach((mr, mrIndex) => {
            // Ensure it's an object
            if (typeof mr !== 'object') mr = { type: "Payload", match: "", replace: "", regex: "String" };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <select class="mr-type" style="border:none; background:transparent; width:100%">
                        ${matchReplaceTypes.map(t => `<option value="${t}" ${mr.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </td>
                <td><input type="text" class="mr-match" value="${mr.match}" style="border:none; background:transparent; width:100%"></td>
                <td><input type="text" class="mr-replace" value="${mr.replace}" style="border:none; background:transparent; width:100%"></td>
                <td>
                    <select class="mr-regex" style="border:none; background:transparent; width:100%">
                        ${matchReplaceRegexTypes.map(t => `<option value="${t}" ${mr.regex === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </td>
                <td style="text-align: center"><button class="btn small danger remove-mr">×</button></td>
            `;

            const updateMR = () => {
                this.profile.steps[stepIndex].match_replace[mrIndex] = {
                    type: tr.querySelector('.mr-type').value,
                    match: tr.querySelector('.mr-match').value,
                    replace: tr.querySelector('.mr-replace').value,
                    regex: tr.querySelector('.mr-regex').value
                };
                this.updateJsonView();
            };

            tr.querySelector('.mr-type').addEventListener('change', updateMR);
            tr.querySelector('.mr-match').addEventListener('input', updateMR);
            tr.querySelector('.mr-replace').addEventListener('input', updateMR);
            tr.querySelector('.mr-regex').addEventListener('change', updateMR);

            tr.querySelector('.remove-mr').addEventListener('click', () => {
                this.profile.steps[stepIndex].match_replace.splice(mrIndex, 1);
                this.renderSteps();
                this.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    renderEncodersList(stepEl, stepIndex, step) {
        const ul = stepEl.querySelector(`#encoder-list-${stepIndex}`);
        (step.encoder || []).forEach((enc, encIndex) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${enc}</span>
                <button class="btn small danger remove-encoder" style="margin-left: auto">×</button>
            `;

            li.querySelector('.remove-encoder').addEventListener('click', () => {
                this.profile.steps[stepIndex].encoder.splice(encIndex, 1);
                this.renderSteps();
                this.updateJsonView();
            });

            ul.appendChild(li);
        });
    }

    renderHeadersTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#headers-table-${stepIndex} tbody`);
        (step.new_headers || []).forEach((header, hIndex) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="header-value" value="${header}" style="border:none; background:transparent; width:100%"></td>
                <td style="text-align: center"><button class="btn small danger remove-header">×</button></td>
            `;

            tr.querySelector('.header-value').addEventListener('input', (e) => {
                this.profile.steps[stepIndex].new_headers[hIndex] = e.target.value;
                this.updateJsonView();
            });

            tr.querySelector('.remove-header').addEventListener('click', () => {
                this.profile.steps[stepIndex].new_headers.splice(hIndex, 1);
                this.renderSteps();
                this.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }
}

new App();
