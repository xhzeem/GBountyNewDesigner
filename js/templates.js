// Template functions for rendering step content

function getStepTemplate(step, index) {
    return `
        <div class="step-header-tabs">
            <div class="step-tab active">Step ${index + 1}</div>
            <div style="flex:1"></div>
            <button class="btn small danger btn-remove-step" data-index="${index}">Remove Step</button>
        </div>
        <div class="step-content">
            <div class="form-group">
                <label>Request Type</label>
                <select class="step-input" data-field="request_type">
                    <option value="original" ${step.request_type === 'original' ? 'selected' : ''}>Original Request</option>
                    <option value="raw_request" ${step.request_type === 'raw_request' ? 'selected' : ''}>Raw Request</option>
                </select>
            </div>

            <div class="inner-tabs">
                <button class="inner-tab-btn active" data-tab="req-${index}">Original Request</button>
                <button class="inner-tab-btn" data-tab="raw-${index}">Raw Request</button>
                <button class="inner-tab-btn" data-tab="res-${index}">Response</button>
                <button class="inner-tab-btn" data-tab="issue-${index}">Issue</button>
            </div>

            <!-- Original Request Content -->
            <div id="req-${index}" class="inner-tab-content active">
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
                        <label>Payload Position</label>
                        <select class="step-input" data-field="payload_position">
                            ${payloadPositions.map(p => `<option value="${p}" ${step.payload_position === p ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group checkbox-group" style="align-items: flex-end; padding-bottom: 10px;">
                        <input type="checkbox" class="step-input" data-field="change_http_request" id="change_http_${index}" ${step.change_http_request ? 'checked' : ''}>
                        <label for="change_http_${index}">Change HTTP Method</label>
                    </div>
                    <div class="form-group">
                        <label>Method Type</label>
                        <select class="step-input" data-field="change_http_request_type" ${!step.change_http_request ? 'disabled' : ''}>
                            ${changeHttpMethods.map(m => `<option value="${m}" ${step.change_http_request_type === m ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="section-header">Insertion Points</div>
                <div class="insertion-points-grid">
                    ${insertionPoints.map(ip => `
                        <div class="checkbox-group">
                            <input type="checkbox" id="ip-${index}-${ip.replace(/\s+/g, '')}" value="${ip}" 
                                ${(step.insertion_points || []).includes(ip) ? 'checked' : ''}
                                class="ip-checkbox">
                            <label for="ip-${index}-${ip.replace(/\s+/g, '')}">${ip}</label>
                        </div>
                    `).join('')}
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
                <div class="data-table-container">
                    <div class="table-toolbar">
                        <button class="btn small secondary btn-add-encoder">Add</button>
                        <select class="encoder-select" style="margin-left: 10px; padding: 4px;">
                            ${payloadEncoders.map(e => `<option value="${e}">${e}</option>`).join('')}
                        </select>
                    </div>
                    <div class="data-table-scroll">
                        <ul class="simple-list" id="encoder-list-${index}"></ul>
                    </div>
                </div>

                <div class="section-header" style="margin-top: 20px">New HTTP Headers</div>
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
            </div>

            <!-- Raw Request Content -->
            <div id="raw-${index}" class="inner-tab-content">
                <div class="form-group">
                    <label>Raw Request</label>
                    <textarea class="step-input" data-field="raw_request" rows="15" style="font-family: monospace;">${step.raw_request || ''}</textarea>
                </div>
            </div>

            <!-- Response Content -->
            <div id="res-${index}" class="inner-tab-content">
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
                                    <label>${rt}</label>
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
            <div id="issue-${index}" class="inner-tab-content">
                <div class="section-header">Issue Properties</div>
                
                <div class="form-group">
                    <label>Show Issue</label>
                    <select class="step-input" data-field="show_alert">
                        ${showIssueOptions.map(opt => `<option value="${opt}" ${step.show_alert === opt ? 'selected' : ''}>${opt}</option>`).join('')}
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
                    <input type="text" class="step-input" data-field="issue_name" value="${step.issue_name || ''}">
                </div>

                <div class="section-header">Issue Detail</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="issue_detail" rows="4">${step.issue_detail || ''}</textarea>
                </div>

                <div class="section-header">Issue Background</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="issue_background" rows="4">${step.issue_background || ''}</textarea>
                </div>

                <div class="section-header">Remediation Detail</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="remediation_detail" rows="4">${step.remediation_detail || ''}</textarea>
                </div>

                <div class="section-header">Remediation Background</div>
                <div class="form-group">
                    <textarea class="step-input" data-field="remediation_background" rows="4">${step.remediation_background || ''}</textarea>
                </div>
            </div>
        </div>
    `;
}
