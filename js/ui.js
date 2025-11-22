class UI {
    constructor(app) {
        this.app = app;
        this.activePassiveTab = 'grep'; // Default active tab for passive profiles
        this.activeStepIndex = 0; // Active step index for active profiles
        this.stepInnerTabs = {}; // Store active inner tab for each step
    }

    // HTML escape function to prevent XSS
    escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Escape function specifically for HTML attributes
    escapeAttribute(text) {
        if (typeof text !== 'string') return text;
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    renderTags() {
        const select = document.getElementById('tags-select');
        select.innerHTML = '';
        (this.app.profile.Tags || []).forEach(tag => {
            const opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag;
            select.appendChild(opt);
        });
    }

    renderSteps() {
        this.app.stepsContainer.innerHTML = '';

        // For passive profiles, render grep configuration directly (no steps)
        if (this.app.profile.scanner !== 'active') {
            this.renderPassiveGrep();
            return;
        }

        // Rest is for active profiles only
        const activeStepIndex = this.activeStepIndex;
        let activeInnerTab = this.stepInnerTabs[activeStepIndex] || 'req';

        // Fix invalid tab for current state
        const activeStep = this.app.profile.steps[activeStepIndex];
        if (activeStep) {
            if (activeStep.request_type === 'original' && activeInnerTab === 'raw') {
                activeInnerTab = 'req';
                this.stepInnerTabs[activeStepIndex] = 'req';
            }
            if (activeStep.request_type === 'raw_request' && activeInnerTab === 'req') {
                activeInnerTab = 'raw';
                this.stepInnerTabs[activeStepIndex] = 'raw';
            }
            // Ensure we never have mismatched tabs - force correct tab based on request type
            if (activeStep.request_type === 'original' && activeInnerTab !== 'req' && activeInnerTab !== 'res' && activeInnerTab !== 'issue') {
                activeInnerTab = 'req';
                this.stepInnerTabs[activeStepIndex] = 'req';
            }
            if (activeStep.request_type === 'raw_request' && activeInnerTab !== 'raw' && activeInnerTab !== 'res' && activeInnerTab !== 'issue') {
                activeInnerTab = 'raw';
                this.stepInnerTabs[activeStepIndex] = 'raw';
            }
        }

        // Create Tabs Container
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'steps-tabs-container';
        this.app.stepsContainer.appendChild(tabsContainer);

        // Create Content Container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'steps-content-container';
        this.app.stepsContainer.appendChild(contentContainer);

        (this.app.profile.steps || []).forEach((step, index) => {
            // Render Tab
            const tab = document.createElement('div');
            tab.className = `step-tab-header ${index === activeStepIndex ? 'active' : ''}`;
            tab.textContent = `Step ${index + 1}`;
            tab.dataset.index = index;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.step-tab-header').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.step-content-wrapper').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                contentContainer.querySelector(`#step-content-${index}`).classList.add('active');
                this.activeStepIndex = index;
                
                // Initialize tab for this step if not exists
                if (!this.stepInnerTabs[index]) {
                    this.stepInnerTabs[index] = 'req';
                }
                
                // Validate and correct tab based on request type
                const step = this.app.profile.steps[index];
                if (step) {
                    let currentTab = this.stepInnerTabs[index];
                    if (step.request_type === 'original' && currentTab === 'raw') {
                        this.stepInnerTabs[index] = 'req';
                        // Update UI to show correct tab
                        setTimeout(() => {
                            const stepEl = document.getElementById(`step-content-${index}`);
                            if (stepEl) {
                                stepEl.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.remove('active'));
                                stepEl.querySelectorAll('.inner-tab-content').forEach(c => c.classList.remove('active'));
                                stepEl.querySelector(`[data-tab="req-${index}"]`)?.classList.add('active');
                                stepEl.querySelector(`#req-${index}`)?.classList.add('active');
                            }
                        }, 0);
                    } else if (step.request_type === 'raw_request' && currentTab === 'req') {
                        this.stepInnerTabs[index] = 'raw';
                        // Update UI to show correct tab
                        setTimeout(() => {
                            const stepEl = document.getElementById(`step-content-${index}`);
                            if (stepEl) {
                                stepEl.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.remove('active'));
                                stepEl.querySelectorAll('.inner-tab-content').forEach(c => c.classList.remove('active'));
                                stepEl.querySelector(`[data-tab="raw-${index}"]`)?.classList.add('active');
                                stepEl.querySelector(`#raw-${index}`)?.classList.add('active');
                            }
                        }, 0);
                    }
                }
            });

            // Add Remove Button to Tab
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-step-icon';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.app.removeStep(index);
            };
            tab.appendChild(removeBtn);
            tabsContainer.appendChild(tab);

            // Render Content
            const stepEl = document.createElement('div');
            stepEl.id = `step-content-${index}`;
            stepEl.className = `step-content-wrapper ${index === activeStepIndex ? 'active' : ''}`;
            stepEl.dataset.index = index;
            stepEl.innerHTML = this.getActiveTemplate(step, index, activeInnerTab);

            this.app.bindStepEvents(stepEl, index, step);

            // Render Tables
            this.renderPayloadsTable(stepEl, index, step);
            this.renderMatchReplaceTable(stepEl, index, step);
            this.renderEncodersList(stepEl, index, step);
            this.renderHeadersTable(stepEl, index, step);
            this.renderGrepsTable(stepEl, index, step);

            contentContainer.appendChild(stepEl);
        });

        // Add "+" Tab
        const addTab = document.createElement('div');
        addTab.className = 'step-tab-header add-step-tab';
        addTab.innerHTML = '+';
        addTab.title = 'Add Step';
        addTab.addEventListener('click', () => {
            this.app.addStep();
        });
        tabsContainer.appendChild(addTab);
    }

    renderPassiveGrep() {
        // Determine active tab, default to 'grep'
        const activeTab = this.activePassiveTab || 'grep';

        const container = this.app.stepsContainer;

        const html = `
            <div class="passive-grep-container">
                <div class="form-group">
                    <label>Passive Type</label>
                    <select id="passive-type-selector" class="passive-type-selector">
                        <option value="passive_request" ${this.app.profile.scanner === 'passive_request' ? 'selected' : ''}>Request</option>
                        <option value="passive_response" ${this.app.profile.scanner === 'passive_response' ? 'selected' : ''}>Response</option>
                    </select>
                </div>
                
                <div class="inner-tabs">
                    <button class="inner-tab-btn ${activeTab === 'grep' ? 'active' : ''}" data-tab="passive-grep">Grep</button>
                    <button class="inner-tab-btn ${activeTab === 'issue' ? 'active' : ''}" data-tab="passive-issue">Issue</button>
                </div>

                <div id="passive-grep" class="inner-tab-content ${activeTab === 'grep' ? 'active' : ''}">
                    <div class="section-header">Grep Configuration</div>
                    <div class="section-desc">Define grep patterns to match in ${this.app.profile.scanner === 'passive_request' ? 'requests' : 'responses'}.</div>
                    
                    <div class="data-table-container">
                        <div class="table-toolbar">
                            <button class="btn small secondary btn-add-grep">Add</button>
                            <button class="btn small secondary btn-clear-greps">Clear</button>
                        </div>
                        <div class="data-table-scroll">
                            <table class="data-table" id="passive-greps-table">
                                <thead>
                                    <tr>
                                        <th style="width: 60px">Enabled</th>
                                        <th style="width: 80px">Operator</th>
                                        <th style="width: 100px">Match Type</th>
                                        <th style="width: 100px">Options</th>
                                        <th>Value</th>
                                        <th style="width: 40px"></th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="passive-issue" class="inner-tab-content ${activeTab === 'issue' ? 'active' : ''}">
                    <div class="section-header">Issue Properties</div>
                    
                    <div class="form-group">
                        <label>Show Issue</label>
                        <select id="passive-show-alert" data-passive-field="show_alert">
                            ${showIssueOptions.map(opt => `<option value="${opt}" ${this.app.profile.show_alert === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Severity</label>
                            <select id="passive-severity" data-passive-field="issue_severity">
                                <option value="high" ${this.app.profile.issue_severity === 'high' ? 'selected' : ''}>High</option>
                                <option value="medium" ${this.app.profile.issue_severity === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="low" ${this.app.profile.issue_severity === 'low' ? 'selected' : ''}>Low</option>
                                <option value="information" ${this.app.profile.issue_severity === 'information' ? 'selected' : ''}>Information</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Confidence</label>
                            <select id="passive-confidence" data-passive-field="issue_confidence">
                                <option value="certain" ${this.app.profile.issue_confidence === 'certain' ? 'selected' : ''}>Certain</option>
                                <option value="firm" ${this.app.profile.issue_confidence === 'firm' ? 'selected' : ''}>Firm</option>
                                <option value="tentative" ${this.app.profile.issue_confidence === 'tentative' ? 'selected' : ''}>Tentative</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Issue Name</label>
                        <input type="text" id="passive-issue-name" data-passive-field="issue_name" value="${this.app.profile.issue_name || ''}">
                    </div>

                    <div class="section-header">Issue Detail</div>
                    <div class="form-group">
                        <textarea id="passive-issue-detail" data-passive-field="issue_detail" rows="4">${this.app.profile.issue_detail || ''}</textarea>
                    </div>

                    <div class="section-header">Issue Background</div>
                    <div class="form-group">
                        <textarea id="passive-issue-background" data-passive-field="issue_background" rows="4">${this.app.profile.issue_background || ''}</textarea>
                    </div>

                    <div class="section-header">Remediation Detail</div>
                    <div class="form-group">
                        <textarea id="passive-remediation-detail" data-passive-field="remediation_detail" rows="4">${this.app.profile.remediation_detail || ''}</textarea>
                    </div>

                    <div class="section-header">Remediation Background</div>
                    <div class="form-group">
                        <textarea id="passive-remediation-background" data-passive-field="remediation_background" rows="4">${this.app.profile.remediation_background || ''}</textarea>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Render grep table
        this.renderPassiveGrepsTable();

        // Bind events
        this.bindPassiveEvents();
    }

    getActiveTemplate(step, index, activeTab) {
        return `
            <div class="form-group">
                <label>Request Type</label>
                <select class="step-input" data-field="request_type">
                    <option value="original" ${step.request_type === 'original' ? 'selected' : ''}>Original Request</option>
                    <option value="raw_request" ${step.request_type === 'raw_request' ? 'selected' : ''}>Raw Request</option>
                </select>
            </div>

            ${index > 0 ? `
            <div class="form-group">
                <label>Insertion Point Mode</label>
                <div class="radio-group">
                    <div class="radio-option">
                        <input type="radio" id="insertion-point-same-${index}" name="insertion-point-mode-${index}" value="same" 
                               ${step.insertion_point === 'same' ? 'checked' : ''} class="step-input" data-field="insertion_point">
                        <label for="insertion-point-same-${index}">Same insertion point than the previous request</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="insertion-point-any-${index}" name="insertion-point-mode-${index}" value="any" 
                               ${step.insertion_point === 'any' ? 'checked' : ''} class="step-input" data-field="insertion_point">
                        <label for="insertion-point-any-${index}">Any insertion point</label>
                    </div>
                </div>
            </div>
            ` : ''}

            <div class="inner-tabs">
                ${step.request_type === 'original'
                ? `<button class="inner-tab-btn ${activeTab === 'req' ? 'active' : ''}" data-tab="req-${index}">Original Request</button>`
                : `<button class="inner-tab-btn ${activeTab === 'raw' ? 'active' : ''}" data-tab="raw-${index}">Raw Request</button>`
            }
                <button class="inner-tab-btn ${activeTab === 'res' ? 'active' : ''}" data-tab="res-${index}">Response</button>
                <button class="inner-tab-btn ${activeTab === 'issue' ? 'active' : ''}" data-tab="issue-${index}">Issue</button>
            </div>

            <!-- Original Request Content -->
            ${step.request_type === 'original' ? `
            <div id="req-${index}" class="inner-tab-content ${activeTab === 'req' ? 'active' : ''}">
                <div class="section-header">Payloads</div>
                <div class="section-desc">You can define one or more payloads.</div>
                
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-payload">Add</button>
                        <button class="btn small secondary btn-clear-payloads">Clear</button>
                    </div>
                    <div class="data-table-scroll">
                        <table class="data-table" id="payloads-table-${index}">
                            <thead>
                                <tr>
                                    <th style="width: 60px">Enabled</th>
                                    <th>Value</th>
                                    <th style="width: 40px"></th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <div class="form-row" style="margin-top: 15px;">
                    <div class="form-group">
                        <label style="margin-bottom: 10px;">Payload Position</label>
                        <select class="step-input" data-field="payload_position">
                            ${payloadPositions.map(p => `<option value="${p}" ${step.payload_position === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <div class="checkbox-group" style="margin-bottom: 8px;">
                            <input type="checkbox" class="step-input" data-field="change_http_request" id="change_http_${index}" ${step.change_http_request ? 'checked' : ''}>
                            <label for="change_http_${index}">Change HTTP Method</label>
                        </div>
                        <select class="step-input" data-field="change_http_request_type" ${!step.change_http_request ? 'disabled' : ''}>
                            ${changeHttpMethods.map(m => {
                                let displayName;
                                switch(m) {
                                    case 'post_to_get': displayName = 'POST to GET'; break;
                                    case 'get_to_post': displayName = 'GET to POST'; break;
                                    case 'get_post_get': displayName = 'GET <-> POST'; break;
                                    default: displayName = m.charAt(0).toUpperCase() + m.slice(1).replace(/_/g, ' ');
                                }
                                return `<option value="${m}" ${step.change_http_request_type === m ? 'selected' : ''}>${displayName}</option>`;
                            }).join('')}
                        </select>
                    </div>
                </div>

                <div class="section-header">Insertion Points</div>
                <div class="insertion-points-toolbar" style="margin-bottom: 10px;">
                    <button class="btn small secondary btn-select-all-ips">Select All</button>
                    <button class="btn small secondary btn-deselect-all-ips">Deselect All</button>
                </div>
                <div class="insertion-points-container">
                    ${Object.entries(insertionPoints).map(([group, points]) => `
                        <div class="ip-group">
                            <div class="ip-group-title">${group}</div>
                            <div class="insertion-points-grid">
                                ${points.map(ip => {
                let keywordClass = '';
                const lower = ip.toLowerCase();
                if (lower.includes('xml')) keywordClass = 'keyword-xml';
                else if (lower.includes('json')) keywordClass = 'keyword-json';
                else if (lower.includes('cookie')) keywordClass = 'keyword-cookie';
                else if (lower.includes('header')) keywordClass = 'keyword-header';
                else if (lower.includes('url')) keywordClass = 'keyword-url';
                else if (lower.includes('body')) keywordClass = 'keyword-body';
                else if (lower.includes('param')) keywordClass = 'keyword-param';

                return `
                                    <div class="checkbox-group">
                                        <input type="checkbox" id="ip-${index}-${ip.replace(/\s+/g, '')}" value="${ip}" 
                                            ${(step.insertion_points || []).includes(ip) ? 'checked' : ''}
                                            class="ip-checkbox">
                                        <label for="ip-${index}-${ip.replace(/\s+/g, '')}" class="${keywordClass}">${ip.charAt(0).toUpperCase() + ip.slice(1).replace(/_/g, ' ')}</label>
                                    </div>
                                `}).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="section-header" style="margin-top: 20px">New HTTP Headers</div>
                <div class="section-desc">The payload will be automatically injected into these headers at the specified insertion points.</div>
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-header">Add</button>
                    </div>
                    <div class="data-table-scroll">
                        <table class="data-table" id="headers-table-${index}">
                            <thead>
                                <tr>
                                    <th>Header String</th>
                                    <th style="width: 40px"></th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <div class="section-header" style="margin-top: 20px">Match and Replace</div>
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-match-replace">Add</button>
                    </div>
                    <div class="data-table-scroll">
                        <table class="data-table" id="match-replace-table-${index}">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Match</th>
                                    <th>Replace</th>
                                    <th>Type</th>
                                    <th style="width: 40px"></th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <div class="section-header" style="margin-top: 20px">Payload Encoding</div>
                <div class="form-group">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="checkbox-group">
                            <input type="checkbox" class="step-input" data-field="url_encode" id="url_encode_${index}" ${step.url_encode !== false ? 'checked' : ''}>
                            <label for="url_encode_${index}">URL Encode</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            <label for="chars_to_url_encode_${index}" style="white-space: nowrap;">Chars to URL Encode:</label>
                            <input type="text" class="step-input" data-field="chars_to_url_encode" id="chars_to_url_encode_${index}" value="${this.escapeAttribute(step.chars_to_url_encode || '')}" style="flex: 1;">
                        </div>
                    </div>
                </div>
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-encoder">Add</button>
                        <select class="encoder-select" style="margin-left: 10px; padding: 4px;">
                            ${payloadEncoders.map(e => `<option value="${e}">${e.charAt(0).toUpperCase() + e.slice(1).replace(/_/g, ' ')}</option>`).join('')}
                        </select>
                    </div>
                    <div class="data-table-scroll">
                        <ul class="simple-list" id="encoder-list-${index}"></ul>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Raw Request Content -->
            ${step.request_type === 'raw_request' ? `
            <div id="raw-${index}" class="inner-tab-content ${activeTab === 'raw' ? 'active' : ''}">
                <div class="form-group">
                    <label>Raw Request</label>
                    <textarea class="step-input" data-field="raw_request" rows="15" style="font-family: monospace;">${this.escapeHtml(step.raw_request || '')}</textarea>
                </div>
            </div>
            ` : ''}

            <!-- Response Content -->
            <div id="res-${index}" class="inner-tab-content ${activeTab === 'res' ? 'active' : ''}">
                <div class="section-header">Grep</div>
                <div class="section-desc">You can define one or more greps.</div>
                
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-grep">Add</button>
                        <button class="btn small secondary btn-clear-greps">Clear</button>
                    </div>
                    <div class="data-table-scroll">
                        <table class="data-table" id="greps-table-${index}">
                            <thead>
                                <tr>
                                    <th style="width: 60px">Enabled</th>
                                    <th style="width: 80px">Operator</th>
                                    <th style="width: 100px">Match Type</th>
                                    <th style="width: 100px">Options</th>
                                    <th>Value</th>
                                    <th style="width: 40px"></th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <div class="section-header" style="margin-top: 20px">Redirections</div>
                <div class="form-group">
                    <div class="checkbox-group" style="margin-bottom: 8px">
                        <label style="width: 120px">Follow redirections:</label>
                        <div style="display: flex; flex-direction: column; gap: 4px">
                            ${redirTypes.map(rt => `
                                <div class="checkbox-group">
                                    <input type="radio" name="redir-${index}" value="${rt}" ${step.redir_type === rt ? 'checked' : ''} class="redir-radio">
                                    <label>${rt.charAt(0).toUpperCase() + rt.slice(1).replace(/_/g, ' ')}</label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-row" style="align-items: center; margin-top: 8px">
                        <label style="width: 120px">Max redirections:</label>
                        <input type="number" class="step-input" data-field="max_redir" value="${step.max_redir || 5}" style="width: 80px">
                    </div>
                </div>
            </div>

            <!-- Issue Content -->
            ${this.getIssueTemplate(step, index, activeTab)}
        `;
    }

    getPassiveRequestTemplate(step, index, activeTab) {
        return `
            <div class="form-group">
                <label>Passive Type</label>
                <select class="step-input passive-type-selector" data-index="${index}">
                    <option value="passive_request" selected>Request</option>
                    <option value="passive_response">Response</option>
                </select>
            </div>

            <div class="inner-tabs">
                <button class="inner-tab-btn ${activeTab === 'req' ? 'active' : ''}" data-tab="req-${index}">Request</button>
                <button class="inner-tab-btn ${activeTab === 'issue' ? 'active' : ''}" data-tab="issue-${index}">Issue</button>
            </div>

            <div id="req-${index}" class="inner-tab-content ${activeTab === 'req' ? 'active' : ''}">
                <div class="section-header">Grep</div>
                <div class="section-desc">You can define one or more greps.</div>
                
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-grep">Add</button>
                        <button class="btn small secondary btn-clear-greps">Clear</button>
                    </div>
                    <div class="data-table-scroll">
                        <table class="data-table" id="greps-table-${index}">
                            <thead>
                                <tr>
                                    <th style="width: 60px">Enabled</th>
                                    <th style="width: 80px">Operator</th>
                                    <th style="width: 100px">Match Type</th>
                                    <th style="width: 100px">Options</th>
                                    <th>Value</th>
                                    <th style="width: 40px"></th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${this.getIssueTemplate(step, index, activeTab)}
        `;
    }

    getPassiveResponseTemplate(step, index, activeTab) {
        return `
            <div class="form-group">
                <label>Passive Type</label>
                <select class="step-input passive-type-selector" data-index="${index}">
                    <option value="passive_request">Request</option>
                    <option value="passive_response" selected>Response</option>
                </select>
            </div>

            <div class="inner-tabs">
                <button class="inner-tab-btn ${activeTab === 'res' ? 'active' : ''}" data-tab="res-${index}">Response</button>
                <button class="inner-tab-btn ${activeTab === 'issue' ? 'active' : ''}" data-tab="issue-${index}">Issue</button>
            </div>

            <div id="res-${index}" class="inner-tab-content ${activeTab === 'res' ? 'active' : ''}">
                <div class="section-header">Grep</div>
                <div class="section-desc">You can define one or more greps.</div>
                
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-grep">Add</button>
                        <button class="btn small secondary btn-clear-greps">Clear</button>
                    </div>
                    <div class="data-table-scroll">
                        <table class="data-table" id="greps-table-${index}">
                            <thead>
                                <tr>
                                    <th style="width: 60px">Enabled</th>
                                    <th style="width: 80px">Operator</th>
                                    <th style="width: 100px">Match Type</th>
                                    <th style="width: 100px">Options</th>
                                    <th>Value</th>
                                    <th style="width: 40px"></th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>

            ${this.getIssueTemplate(step, index, activeTab)}
        `;
    }

    getIssueTemplate(step, index, activeTab) {
        return `
            <div id="issue-${index}" class="inner-tab-content ${activeTab === 'issue' ? 'active' : ''}">
                <div class="section-header">Issue Properties</div>
                
                <div class="form-group">
                    <label>Show Issue</label>
                    <select class="step-input" data-field="show_alert">
                        ${showIssueOptions.map(opt => `<option value="${opt}" ${step.show_alert === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}</option>`).join('')}
                    </select>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Severity</label>
                        <select class="step-input" data-field="issue_severity">
                            <option value="High" ${step.issue_severity === 'High' ? 'selected' : ''}>High</option>
                            <option value="Medium" ${step.issue_severity === 'Medium' ? 'selected' : ''}>Medium</option>
                            <option value="Low" ${step.issue_severity === 'Low' ? 'selected' : ''}>Low</option>
                            <option value="Information" ${step.issue_severity === 'Information' ? 'selected' : ''}>Information</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Confidence</label>
                        <select class="step-input" data-field="issue_confidence">
                            <option value="Certain" ${step.issue_confidence === 'Certain' ? 'selected' : ''}>Certain</option>
                            <option value="Firm" ${step.issue_confidence === 'Firm' ? 'selected' : ''}>Firm</option>
                            <option value="Tentative" ${step.issue_confidence === 'Tentative' ? 'selected' : ''}>Tentative</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Issue Name</label>
                    <input type="text" class="step-input" data-field="issue_name" value="${this.escapeAttribute(step.issue_name || '')}">
                </div>

                <div class="section-header">Issue Detail</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="issue_detail" rows="4">${this.escapeHtml(step.issue_detail || '')}</textarea>
                </div>

                <div class="section-header">Issue Background</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="issue_background" rows="4">${this.escapeHtml(step.issue_background || '')}</textarea>
                </div>

                <div class="section-header">Remediation Detail</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="remediation_detail" rows="4">${this.escapeHtml(step.remediation_detail || '')}</textarea>
                </div>

                <div class="section-header">Remediation Background</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="remediation_background" rows="4">${this.escapeHtml(step.remediation_background || '')}</textarea>
                </div>
            </div>
        `;
    }

    renderPayloadsTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#payloads-table-${stepIndex} tbody`);
        if (!tbody) return;
        (step.payloads || []).forEach((pStr, pIndex) => {
            const payload = parsePayload(pStr);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center"><input type="checkbox" class="payload-enable" ${payload.enabled ? 'checked' : ''}></td>
                <td><input type="text" class="payload-value" value="${this.escapeAttribute(payload.value)}" style="border:none; background:transparent; width:100%"></td>
                <td style="text-align: center"><button class="btn small danger remove-payload">×</button></td>
            `;

            const updatePayload = () => {
                const enabled = tr.querySelector('.payload-enable').checked;
                const value = tr.querySelector('.payload-value').value;
                this.app.profile.steps[stepIndex].payloads[pIndex] = serializePayload({ enabled, value });
                this.app.updateJsonView();
            };

            tr.querySelector('.payload-enable').addEventListener('change', updatePayload);
            tr.querySelector('.payload-value').addEventListener('input', updatePayload);
            tr.querySelector('.remove-payload').addEventListener('click', () => {
                this.app.profile.steps[stepIndex].payloads.splice(pIndex, 1);
                this.renderSteps();
                this.app.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    renderGrepsTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#greps-table-${stepIndex} tbody`);
        if (!tbody) return;
        (step.grep || []).forEach((gStr, gIndex) => {
            const grep = parseGrep(gStr);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center"><input type="checkbox" class="grep-enable" ${grep.enabled ? 'checked' : ''}></td>
                <td>
                    <select class="grep-operator" style="border:none; background:transparent; width:100%">
                        <option value="OR" ${grep.operator === 'OR' ? 'selected' : ''}>Or</option>
                        <option value="AND" ${grep.operator === 'AND' ? 'selected' : ''}>And</option>
                        <option value="OR NOT" ${grep.operator === 'OR NOT' ? 'selected' : ''}>Or not</option>
                        <option value="AND NOT" ${grep.operator === 'AND NOT' ? 'selected' : ''}>And not</option>
                    </select>
                </td>
                <td>
                    <select class="grep-match-type" style="border:none; background:transparent; width:100%">
                        <option value="Simple String" ${grep.match_type === 'Simple String' ? 'selected' : ''}>Simple string</option>
                        <option value="Regex" ${grep.match_type === 'Regex' ? 'selected' : ''}>Regex</option>
                        <option value="Blind Host" ${grep.match_type === 'Blind Host' ? 'selected' : ''}>Blind host</option>
                        <option value="Status Code" ${grep.match_type === 'Status Code' ? 'selected' : ''}>Status code</option>
                        <option value="Time Delay" ${grep.match_type === 'Time Delay' ? 'selected' : ''}>Time delay</option>
                        <option value="Content Type" ${grep.match_type === 'Content Type' ? 'selected' : ''}>Content type</option>
                        <option value="Content Length" ${grep.match_type === 'Content Length' ? 'selected' : ''}>Content length</option>
                        <option value="Content Length Diff" ${grep.match_type === 'Content Length Diff' ? 'selected' : ''}>Content length diff</option>
                        <option value="URL Extension" ${grep.match_type === 'URL Extension' ? 'selected' : ''}>URL extension</option>
                    </select>
                </td>
                <td><select class="grep-options" style="border:none; background:transparent; width:100%">${grepOptionsForPassiveResponse.map(opt => `<option value="${opt}" ${grep.options === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}</option>`).join('')}</select></td>
                <td><input type="text" class="grep-value" value="${this.escapeAttribute(grep.value)}" style="border:none; background:transparent; width:100%"></td>
                <td style="text-align: center"><button class="btn small danger remove-grep">×</button></td>
            `;

            const updateGrep = () => {
                const enabled = tr.querySelector('.grep-enable').checked;
                const operator = tr.querySelector('.grep-operator').value;
                const match_type = tr.querySelector('.grep-match-type').value;
                const options = tr.querySelector('.grep-options').value;
                const value = tr.querySelector('.grep-value').value;
                this.app.profile.steps[stepIndex].grep[gIndex] = serializeGrep({ enabled, operator, match_type, options, value });
                this.app.updateJsonView();
            };

            tr.querySelector('.grep-enable').addEventListener('change', updateGrep);
            tr.querySelector('.grep-operator').addEventListener('change', updateGrep);
            tr.querySelector('.grep-match-type').addEventListener('change', updateGrep);
            tr.querySelector('.grep-options').addEventListener('change', updateGrep);
            tr.querySelector('.grep-value').addEventListener('input', updateGrep);

            tr.querySelector('.remove-grep').addEventListener('click', () => {
                this.app.profile.steps[stepIndex].grep.splice(gIndex, 1);
                this.renderSteps();
                this.app.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    renderMatchReplaceTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#match-replace-table-${stepIndex} tbody`);
        if (!tbody) return;
        (step.match_replace || []).forEach((mr, mrIndex) => {
            if (typeof mr !== 'object') mr = { type: "Payload", match: "", replace: "", regex: "String" };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <select class="mr-type" style="border:none; background:transparent; width:100%">
                        ${matchReplaceTypes.map(t => `<option value="${t}" ${mr.type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                    </select>
                </td>
                <td><input type="text" class="mr-match" value="${this.escapeAttribute(mr.match)}" style="border:none; background:transparent; width:100%"></td>
                <td><input type="text" class="mr-replace" value="${this.escapeAttribute(mr.replace)}" style="border:none; background:transparent; width:100%"></td>
                <td>
                    <select class="mr-regex" style="border:none; background:transparent; width:100%">
                        ${matchReplaceRegexTypes.map(t => `<option value="${t}" ${mr.regex === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                    </select>
                </td>
                <td style="text-align: center"><button class="btn small danger remove-mr">×</button></td>
            `;

            const updateMR = () => {
                this.app.profile.steps[stepIndex].match_replace[mrIndex] = {
                    type: tr.querySelector('.mr-type').value,
                    match: tr.querySelector('.mr-match').value,
                    replace: tr.querySelector('.mr-replace').value,
                    regex: tr.querySelector('.mr-regex').value
                };
                this.app.updateJsonView();
            };

            tr.querySelector('.mr-type').addEventListener('change', updateMR);
            tr.querySelector('.mr-match').addEventListener('input', updateMR);
            tr.querySelector('.mr-replace').addEventListener('input', updateMR);
            tr.querySelector('.mr-regex').addEventListener('change', updateMR);

            tr.querySelector('.remove-mr').addEventListener('click', () => {
                this.app.profile.steps[stepIndex].match_replace.splice(mrIndex, 1);
                this.renderSteps();
                this.app.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    renderEncodersList(stepEl, stepIndex, step) {
        const ul = stepEl.querySelector(`#encoder-list-${stepIndex}`);
        if (!ul) return;
        (step.encoder || []).forEach((enc, encIndex) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${this.escapeHtml(enc)}</span>
                <button class="btn small danger remove-encoder" style="margin-left: auto">×</button>
            `;

            li.querySelector('.remove-encoder').addEventListener('click', () => {
                this.app.profile.steps[stepIndex].encoder.splice(encIndex, 1);
                this.renderSteps();
                this.app.updateJsonView();
            });

            ul.appendChild(li);
        });
    }

    renderHeadersTable(stepEl, stepIndex, step) {
        const tbody = stepEl.querySelector(`#headers-table-${stepIndex} tbody`);
        if (!tbody) return;
        (step.new_headers || []).forEach((header, hIndex) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="header-value" value="${this.escapeAttribute(header)}" style="border:none; background:transparent; width:100%"></td>
                <td style="text-align: center"><button class="btn small danger remove-header">×</button></td>
            `;

            tr.querySelector('.header-value').addEventListener('input', (e) => {
                this.app.profile.steps[stepIndex].new_headers[hIndex] = e.target.value;
                this.app.updateJsonView();
            });

            tr.querySelector('.remove-header').addEventListener('click', () => {
                this.app.profile.steps[stepIndex].new_headers.splice(hIndex, 1);
                this.renderSteps();
                this.app.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    renderPassiveGrepsTable() {
        const tbody = document.querySelector('#passive-greps-table tbody');
        if (!tbody) return;

        // Determine options based on scanner type
        const options = this.app.profile.scanner === 'passive_request' ? grepOptionsForActiveRequest : grepOptionsForPassiveResponse;

        (this.app.profile.grep || []).forEach((gStr, gIndex) => {
            const grep = parseGrep(gStr);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center"><input type="checkbox" class="grep-enable" ${grep.enabled ? 'checked' : ''}></td>
                <td>
                    <select class="grep-operator" style="border:none; background:transparent; width:100%">
                        <option value="OR" ${grep.operator === 'OR' ? 'selected' : ''}>Or</option>
                        <option value="AND" ${grep.operator === 'AND' ? 'selected' : ''}>And</option>
                        <option value="OR NOT" ${grep.operator === 'OR NOT' ? 'selected' : ''}>Or not</option>
                        <option value="AND NOT" ${grep.operator === 'AND NOT' ? 'selected' : ''}>And not</option>
                    </select>
                </td>
                <td>
                    <select class="grep-match-type" style="border:none; background:transparent; width:100%">
                        <option value="Simple String" ${grep.match_type === 'Simple String' ? 'selected' : ''}>Simple string</option>
                        <option value="Regex" ${grep.match_type === 'Regex' ? 'selected' : ''}>Regex</option>
                        <option value="Blind Host" ${grep.match_type === 'Blind Host' ? 'selected' : ''}>Blind host</option>
                        <option value="Status Code" ${grep.match_type === 'Status Code' ? 'selected' : ''}>Status code</option>
                        <option value="Time Delay" ${grep.match_type === 'Time Delay' ? 'selected' : ''}>Time delay</option>
                        <option value="Content Type" ${grep.match_type === 'Content Type' ? 'selected' : ''}>Content type</option>
                        <option value="Content Length" ${grep.match_type === 'Content Length' ? 'selected' : ''}>Content length</option>
                        <option value="Content Length Diff" ${grep.match_type === 'Content Length Diff' ? 'selected' : ''}>Content length diff</option>
                        <option value="URL Extension" ${grep.match_type === 'URL Extension' ? 'selected' : ''}>URL extension</option>
                    </select>
                </td>
                <td><select class="grep-options" style="border:none; background:transparent; width:100%">${options.map(opt => `<option value="${opt}" ${grep.options === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, ' ')}</option>`).join('')}</select></td>
                <td><input type="text" class="grep-value" value="${this.escapeAttribute(grep.value)}" style="border:none; background:transparent; width:100%"></td>
                <td style="text-align: center"><button class="btn small danger remove-grep">×</button></td>
            `;

            const updateGrep = () => {
                const enabled = tr.querySelector('.grep-enable').checked;
                const operator = tr.querySelector('.grep-operator').value;
                const match_type = tr.querySelector('.grep-match-type').value;
                const options = tr.querySelector('.grep-options').value;
                const value = tr.querySelector('.grep-value').value;
                this.app.profile.grep[gIndex] = serializeGrep({ enabled, operator, match_type, options, value });
                this.app.updateJsonView();
            };

            tr.querySelector('.grep-enable').addEventListener('change', updateGrep);
            tr.querySelector('.grep-operator').addEventListener('change', updateGrep);
            tr.querySelector('.grep-match-type').addEventListener('change', updateGrep);
            tr.querySelector('.grep-options').addEventListener('change', updateGrep);
            tr.querySelector('.grep-value').addEventListener('input', updateGrep);

            tr.querySelector('.remove-grep').addEventListener('click', () => {
                this.app.profile.grep.splice(gIndex, 1);
                this.renderSteps();
                this.app.updateJsonView();
            });

            tbody.appendChild(tr);
        });
    }

    bindPassiveEvents() {
        // Passive type selector
        const typeSelector = document.getElementById('passive-type-selector');
        if (typeSelector) {
            typeSelector.addEventListener('change', (e) => {
                this.app.profile.scanner = e.target.value;
                this.renderSteps(); // Re-render to update description
                this.app.updateJsonView();
            });
        }

        // Passive inner tabs
        document.querySelectorAll('.passive-grep-container .inner-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.passive-grep-container .inner-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.passive-grep-container .inner-tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                const tab = e.target.dataset.tab;
                document.getElementById(tab).classList.add('active');
                this.activePassiveTab = tab.replace('passive-', '');
            });
        });

        // Passive field inputs
        document.querySelectorAll('[data-passive-field]').forEach(input => {
            input.addEventListener('input', (e) => {
                const field = e.target.dataset.passiveField;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                this.app.profile[field] = value;
                this.app.updateJsonView();
            });
        });

        // Add grep button
        const addGrepBtn = document.querySelector('.btn-add-grep');
        if (addGrepBtn) {
            addGrepBtn.addEventListener('click', () => {
                if (!this.app.profile.grep) this.app.profile.grep = [];
                this.app.profile.grep.push("true,OR,Simple String,,");
                this.renderSteps();
                this.app.updateJsonView();
            });
        }

        // Clear greps button
        const clearGrepsBtn = document.querySelector('.btn-clear-greps');
        if (clearGrepsBtn) {
            clearGrepsBtn.addEventListener('click', () => {
                this.app.profile.grep = [];
                this.renderSteps();
                this.app.updateJsonView();
            });
        }
    }
}
