class App {
    constructor() {
        this.jsonEditor = document.getElementById('json-editor');
        this.stepsContainer = document.getElementById('steps-container');
        this.ui = new UI(this);
        this.templateManager = new TemplateManager();
        this.currentTemplateId = null;
        this.hasUnsavedChanges = false;

        // Load from localStorage or use default
        this.profile = this.loadFromLocalStorage() || JSON.parse(JSON.stringify(defaultProfile));

        this.init();
    }

    init() {
        this.bindGlobalEvents();
        this.bindTemplateEvents();
        this.renderTemplatesList();
        this.renderForm();
        this.initResize();
        this.initJsonView();
        this.updateJsonView();
        this.updateTemplateStats();
        
        // Restore last session state
        this.restoreSessionState();
    }

    initResize() {
        const handle = document.getElementById('resize-handle');
        const panel = document.getElementById('preview-panel');
        let isResizing = false;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            handle.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const containerWidth = document.body.clientWidth;
            const newWidth = containerWidth - e.clientX;
            if (newWidth > 200 && newWidth < containerWidth - 300) {
                panel.style.flex = 'none';
                panel.style.width = `${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            handle.classList.remove('dragging');
            document.body.style.cursor = '';
        });
    }

    initJsonView() {
        const viewer = document.getElementById('json-viewer');
        const editor = document.getElementById('json-editor');
        const toggleBtn = document.getElementById('btn-toggle-view');
        const hideBtn = document.getElementById('btn-hide-json');
        const showBtn = document.getElementById('btn-show-json');
        const panel = document.getElementById('preview-panel');
        const handle = document.getElementById('resize-handle');

        this.isJsonEditMode = false;

        toggleBtn.addEventListener('click', () => {
            this.isJsonEditMode = !this.isJsonEditMode;
            toggleBtn.textContent = this.isJsonEditMode ? 'View JSON' : 'Edit JSON';
            if (this.isJsonEditMode) {
                viewer.classList.remove('active');
                editor.classList.remove('hidden');
            } else {
                this.updateJsonView();
                editor.classList.add('hidden');
                viewer.classList.add('active');
            }
        });

        hideBtn.addEventListener('click', () => {
            panel.style.display = 'none';
            handle.style.display = 'none';
            showBtn.style.display = 'block';
        });

        showBtn.addEventListener('click', () => {
            panel.style.display = 'flex';
            handle.style.display = 'block';
            showBtn.style.display = 'none';
        });

        // Initial state
        editor.classList.add('hidden');
        viewer.classList.add('active');
    }

    syntaxHighlight(json) {
        if (typeof json !== 'string') {
            json = JSON.stringify(json, null, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    bindGlobalEvents() {
        // JSON Editor changes
        this.jsonEditor.addEventListener('input', () => {
            try {
                let data = JSON.parse(this.jsonEditor.value);
                // If data is an array, extract the first element
                if (Array.isArray(data) && data.length > 0) {
                    data = data[0];
                }
                this.profile = data;
                this.renderForm();
                this.markAsChanged();
                // Remove error state
                document.querySelector('.panel-header').classList.remove('json-error');
            } catch (e) {
                // Show error state - add red border to JSON panel header
                document.querySelector('.panel-header').classList.add('json-error');
            }
        });

        // Global Inputs
        document.querySelectorAll('[data-path]').forEach(input => {
            input.addEventListener('input', (e) => {
                const path = e.target.dataset.path;
                let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

                // If scanner is set to "passive", default to "passive_request"
                if (path === 'scanner' && value === 'passive') {
                    value = 'passive_request';
                }

                const oldScanner = this.profile[path];
                this.profile[path] = value;

                // If scanner type changes between active/passive, recreate profile with appropriate structure
                if (path === 'scanner' && oldScanner !== value) {
                    const isOldActive = oldScanner === 'active';
                    const isNewActive = value === 'active';

                    if (isOldActive !== isNewActive) {
                        // Switching between active and passive structure
                        const newProfile = getDefaultProfile(value);
                        // Preserve basic info
                        newProfile.profile_name = this.profile.profile_name;
                        newProfile.author = this.profile.author;
                        newProfile.enabled = this.profile.enabled;
                        newProfile.Tags = this.profile.Tags || [];
                        newProfile.scanner = value;
                        this.profile = newProfile;
                    }
                }

                this.updateJsonView();
                if (path === 'scanner') this.renderForm();
            });
        });

        // Page Navigation
        document.getElementById('btn-show-templates').addEventListener('click', () => {
            this.showPage('templates');
        });

        document.getElementById('btn-show-profile').addEventListener('click', () => {
            this.showPage('profile');
        });

        document.getElementById('btn-back-to-templates').addEventListener('click', () => {
            this.showPage('templates');
        });

        // Main Tabs (within profile editor)
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
            if (this.hasUnsavedChanges && !confirm('You have unsaved changes. Continue?')) {
                return;
            }
            
            // Create new template directly
            const templateName = prompt('Template name:', 'New Template');
            if (templateName) {
                const newTemplate = this.templateManager.createTemplate(templateName);
                this.loadTemplate(newTemplate.id);
            }
        });

        document.getElementById('btn-open').addEventListener('click', () => {
            if (this.hasUnsavedChanges && !confirm('You have unsaved changes. Continue?')) {
                return;
            }
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.bb2,.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        let data = JSON.parse(event.target.result);
                        // If data is an array, extract the first element
                        if (Array.isArray(data) && data.length > 0) {
                            data = data[0];
                        }
                        
                        // Get template name from profile or file name
                        const profileName = data.profile_name || file.name.replace(/\.(bb2|json)$/i, '');
                        const templateName = prompt('Template name:', profileName);
                        
                        if (templateName) {
                            // Create new template with the opened profile data
                            const newTemplate = this.templateManager.createTemplate(templateName);
                            this.templateManager.updateTemplate(newTemplate.id, data);
                            this.loadTemplate(newTemplate.id);
                        }
                    } catch (err) {
                        alert('Error parsing file: ' + err.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });

        document.getElementById('btn-download').addEventListener('click', () => {
            // Wrap profile in array for .bb2 format
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([this.profile], null, 2));
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

        // Variables Modal
        const modal = document.getElementById('variables-modal');
        const btnVariables = document.getElementById('btn-variables');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const variablesTableBody = document.querySelector('#variables-table tbody');

        const variables = [
            { name: "{BH}", desc: "Replaced by Blind Host domain automatically." },
            { name: "{EMAIL}", desc: "Replaced by email address specified at \"email\" parameter." },
            { name: "{RANDOM}", desc: "Replaced by a random number." },
            { name: "{CURRENT_URL}", desc: "Replaced by entire original URL request." },
            { name: "{CURRENT_PORT}", desc: "Replaced bythe original request web server port." },
            { name: "{CURRENT_PATH}", desc: "Replaced by the original request path." },
            { name: "{CURRENT_HOST}", desc: "Replaced by the original request host." },
            { name: "{CURRENT_METHOD}", desc: "Replaced by the original request method. (GET, POST, etc.)" },
            { name: "{CURRENT_QUERY}", desc: "Replaced by the original request POST data query." },
            { name: "{CURRENT_SUBDOMAIN}", desc: "Replaced by the original request subdomain. (www,docs,prod,etc)" },
            { name: "{CURRENT_FILE}", desc: "Replaced by the original request file." },
            { name: "{CURRENT_PROTOCOL}", desc: "Replaced by the original request protocol. (http,https)" },
            { name: "{CURRENT_USER_AGENT}", desc: "Replaced by the original request user agent header value." },
            { name: "{CURRENT_REFERER}", desc: "Replaced by the original request referer header value." },
            { name: "{CURRENT_ORIGIN}", desc: "Replaced by the original request origin header value." },
            { name: "{CURRENT_ACCEPT}", desc: "Replaced by the original request accept header value." },
            { name: "{CURRENT_CONTENT_TYPE}", desc: "Replaced by the original request content type header value." },
            { name: "{CURRENT_ACCEPT_LANGUAGE}", desc: "Replaced by the original request accept language header value." },
            { name: "{CURRENT_ACCEPT_ENCODING}", desc: "Replaced by the original request accept encoding header value." },
            { name: "{CURRENT_CONTENT_LENGTH}", desc: "Replaced by the original request cointent length header value." }
        ];

        btnVariables.addEventListener('click', () => {
            variablesTableBody.innerHTML = variables.map(v => `
                <tr>
                    <td style="font-family: monospace; color: var(--accent);">${v.name}</td>
                    <td>${v.desc}</td>
                </tr>
            `).join('');
            modal.style.display = 'flex';
        });

        btnCloseModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
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
                this.ui.renderTags();
                this.updateJsonView();
                input.value = '';
            }
        });

        removeBtn.addEventListener('click', () => {
            const selected = Array.from(select.selectedOptions).map(opt => opt.value);
            this.profile.Tags = this.profile.Tags.filter(t => !selected.includes(t));
            this.ui.renderTags();
            this.updateJsonView();
        });

        select.addEventListener('change', () => {
            removeBtn.disabled = select.selectedOptions.length === 0;
        });
    }

    updateJsonView(skipMarkAsChanged = false) {
        // Wrap profile in array for .bb2 format display
        const jsonStr = JSON.stringify([this.profile], null, 2);
        this.jsonEditor.value = jsonStr;
        if (!this.isJsonEditMode) {
            const viewer = document.getElementById('json-viewer');
            if (viewer) viewer.innerHTML = this.syntaxHighlight(jsonStr);
        }
        if (!skipMarkAsChanged) {
            this.markAsChanged();
        }
        this.saveToLocalStorage();
    }

    markAsChanged() {
        if (!this.hasUnsavedChanges) {
            this.hasUnsavedChanges = true;
            this.updateCurrentTemplateInfo();
            
            // Save session state when changes are made
            this.saveSessionState();
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('gbounty-profile', JSON.stringify(this.profile));
            console.log('Profile saved to localStorage:', this.profile.profile_name || 'Unnamed');
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('gbounty-profile');
            const profile = saved ? JSON.parse(saved) : null;
            if (profile) {
                console.log('Profile loaded from localStorage:', profile.profile_name || 'Unnamed');
            } else {
                console.log('No profile found in localStorage');
            }
            return profile;
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    }

    saveSessionState() {
        try {
            const sessionState = {
                currentTemplateId: this.currentTemplateId,
                hasUnsavedChanges: this.hasUnsavedChanges,
                currentPage: this.getCurrentPage(),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('gbounty-session-state', JSON.stringify(sessionState));
        } catch (e) {
            console.error('Failed to save session state:', e);
        }
    }

    loadSessionState() {
        try {
            const saved = localStorage.getItem('gbounty-session-state');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error('Failed to load session state:', e);
            return null;
        }
    }

    getCurrentPage() {
        const templatesPage = document.getElementById('templates-page');
        const profilePage = document.getElementById('profile-page');
        
        if (templatesPage && templatesPage.classList.contains('active')) {
            return 'templates';
        } else if (profilePage && profilePage.classList.contains('active')) {
            return 'profile';
        }
        return 'templates'; // default
    }

    restoreSessionState() {
        const sessionState = this.loadSessionState();
        
        if (sessionState) {
            // Restore template-based session
            if (sessionState.currentTemplateId) {
                // Check if the template still exists
                const template = this.templateManager.getTemplate(sessionState.currentTemplateId);
                
                if (template) {
                    // Restore the template ID and unsaved changes state
                    this.currentTemplateId = sessionState.currentTemplateId;
                    this.hasUnsavedChanges = sessionState.hasUnsavedChanges || false;
                    
                    // Keep the working profile from localStorage (which may have unsaved changes)
                    // Only restore from template if we don't have unsaved changes
                    
                    // Update UI
                    this.renderForm();
                    this.updateJsonView(true); // Skip marking as changed
                    this.updateCurrentTemplateInfo();
                    this.renderTemplatesList();
                    
                    // Restore the page
                    const targetPage = sessionState.currentPage || 'profile';
                    this.showPage(targetPage);
                    
                    console.log(`Restored session: Template "${template.name}" on ${targetPage} page`);
                    return;
                } else {
                    console.log('Previously opened template no longer exists');
                }
            }
        }
        
        // Default behavior - start on templates page
        this.showPage('templates');
    }

    renderForm() {
        document.getElementById('profile_name').value = this.profile.profile_name || '';
        document.getElementById('author').value = this.profile.author || '';

        // Display "passive" in dropdown for both passive_request and passive_response
        const scannerValue = this.profile.scanner || 'active';
        const displayValue = scannerValue.startsWith('passive') ? 'passive' : scannerValue;
        document.getElementById('scanner').value = displayValue;

        document.getElementById('enabled').checked = this.profile.enabled !== false;

        this.ensureFirstStepInsertionPoint();
        this.ui.renderTags();
        this.ui.renderSteps();
    }

    addStep() {
        const newStep = JSON.parse(JSON.stringify(defaultProfile.steps[0]));
        this.profile.steps.push(newStep);
        this.ui.activeStepIndex = this.profile.steps.length - 1;
        // Initialize inner tab for new step
        this.ui.stepInnerTabs[this.profile.steps.length - 1] = 'req';
        this.ensureFirstStepInsertionPoint();
        this.ui.renderSteps();
        this.updateJsonView();
        this.saveToLocalStorage();
    }

    ensureFirstStepInsertionPoint() {
        // Ensure first step always has insertion_point set to "same"
        if (this.profile.steps.length > 0) {
            this.profile.steps[0].insertion_point = "same";
        }
    }

    removeStep(index) {
        this.profile.steps.splice(index, 1);
        // Clean up stepInnerTabs
        delete this.ui.stepInnerTabs[index];
        // Rebuild stepInnerTabs with new indices
        const newTabs = {};
        Object.keys(this.ui.stepInnerTabs).forEach(i => {
            const newIndex = parseInt(i) > index ? parseInt(i) - 1 : parseInt(i);
            newTabs[newIndex] = this.ui.stepInnerTabs[i];
        });
        this.ui.stepInnerTabs = newTabs;
        // Adjust active step index if necessary
        if (this.ui.activeStepIndex >= this.profile.steps.length) {
            this.ui.activeStepIndex = Math.max(0, this.profile.steps.length - 1);
        }
        this.ui.renderSteps();
        this.updateJsonView();
    }

    bindStepEvents(stepEl, index, step) {
        // Inner Tabs
        stepEl.querySelectorAll('.inner-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                stepEl.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.remove('active'));
                stepEl.querySelectorAll('.inner-tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                stepEl.querySelector(`#${e.target.dataset.tab}`).classList.add('active');
                this.ui.stepInnerTabs[index] = e.target.dataset.tab.split('-')[0];
            });
        });

        // Inputs
        stepEl.querySelectorAll('.step-input').forEach(input => {
            const handleInputChange = (e) => {
                const field = e.target.dataset.field;
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

                // Handle passive type selector
                if (e.target.classList.contains('passive-type-selector')) {
                    this.profile.scanner = value; // Update scanner field directly
                    this.ui.renderSteps(); // Re-render to switch between request/response templates
                    this.updateJsonView();
                    return;
                }

                // Prevent changing insertion_point for first step (index 0)
                if (field === 'insertion_point' && index === 0) {
                    this.profile.steps[index][field] = 'same'; // Force first step to always be 'same'
                } else {
                    this.profile.steps[index][field] = value;
                }

                // Handle Change HTTP Method dependency or Request Type change
                if (field === 'change_http_request' || field === 'request_type') {
                    // If request type changed, validate and correct the active tab
                    if (field === 'request_type') {
                        const stepIndex = parseInt(stepEl.dataset.index || index);
                        let currentTab = this.ui.stepInnerTabs[stepIndex] || 'req';
                        
                        if (value === 'original' && currentTab === 'raw') {
                            this.ui.stepInnerTabs[stepIndex] = 'req';
                            // Update UI to show correct tab
                            setTimeout(() => {
                                stepEl.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.remove('active'));
                                stepEl.querySelectorAll('.inner-tab-content').forEach(c => c.classList.remove('active'));
                                stepEl.querySelector(`[data-tab="req-${stepIndex}"]`)?.classList.add('active');
                                stepEl.querySelector(`#req-${stepIndex}`)?.classList.add('active');
                            }, 0);
                        } else if (value === 'raw_request' && currentTab === 'req') {
                            this.ui.stepInnerTabs[stepIndex] = 'raw';
                            // Update UI to show correct tab
                            setTimeout(() => {
                                stepEl.querySelectorAll('.inner-tab-btn').forEach(b => b.classList.remove('active'));
                                stepEl.querySelectorAll('.inner-tab-content').forEach(c => c.classList.remove('active'));
                                stepEl.querySelector(`[data-tab="raw-${stepIndex}"]`)?.classList.add('active');
                                stepEl.querySelector(`#raw-${stepIndex}`)?.classList.add('active');
                            }, 0);
                        }
                    }
                    
                    this.ui.renderSteps(); // Re-render to enable/disable dependent field or update tabs
                    this.updateJsonView();
                } else {
                    this.updateJsonView();
                }
            };
            
            // Add both input and change event listeners for radio buttons
            input.addEventListener('input', handleInputChange);
            input.addEventListener('change', handleInputChange);
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

        // Select All IPs
        const btnSelectAll = stepEl.querySelector('.btn-select-all-ips');
        if (btnSelectAll) {
            btnSelectAll.addEventListener('click', () => {
                const allIps = [];
                Object.values(insertionPoints).forEach(group => allIps.push(...group));
                this.profile.steps[index].insertion_points = allIps;
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

        // Deselect All IPs
        const btnDeselectAll = stepEl.querySelector('.btn-deselect-all-ips');
        if (btnDeselectAll) {
            btnDeselectAll.addEventListener('click', () => {
                this.profile.steps[index].insertion_points = [];
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

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
        const addPayloadBtn = stepEl.querySelector('.btn-add-payload');
        if (addPayloadBtn) {
            addPayloadBtn.addEventListener('click', () => {
                this.profile.steps[index].payloads.push("true,");
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

        // Clear Payloads
        const clearPayloadsBtn = stepEl.querySelector('.btn-clear-payloads');
        if (clearPayloadsBtn) {
            clearPayloadsBtn.addEventListener('click', () => {
                this.profile.steps[index].payloads = [];
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

        // Add Grep
        const addGrepBtn = stepEl.querySelector('.btn-add-grep');
        if (addGrepBtn) {
            addGrepBtn.addEventListener('click', () => {
                this.profile.steps[index].grep.push("true,OR,Simple String,,");
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

        // Clear Greps
        const clearGrepsBtn = stepEl.querySelector('.btn-clear-greps');
        if (clearGrepsBtn) {
            clearGrepsBtn.addEventListener('click', () => {
                this.profile.steps[index].grep = [];
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

        // Add Match Replace
        const addMRBtn = stepEl.querySelector('.btn-add-match-replace');
        if (addMRBtn) {
            addMRBtn.addEventListener('click', () => {
                this.profile.steps[index].match_replace.push({ type: "Payload", match: "", replace: "", regex: "String" });
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

        // Add Encoder
        const addEncBtn = stepEl.querySelector('.btn-add-encoder');
        if (addEncBtn) {
            addEncBtn.addEventListener('click', () => {
                const select = stepEl.querySelector('.encoder-select');
                const val = select.value;
                this.profile.steps[index].encoder.push(val);
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }

        // Add Header
        const addHeaderBtn = stepEl.querySelector('.btn-add-header');
        if (addHeaderBtn) {
            addHeaderBtn.addEventListener('click', () => {
                this.profile.steps[index].new_headers.push("");
                this.ui.renderSteps();
                this.updateJsonView();
            });
        }
    }

    // Template Management Methods
    bindTemplateEvents() {
        // Create Template
        document.getElementById('btn-create-template').addEventListener('click', () => {
            const name = prompt('Template name:', 'New Template');
            if (name) {
                const template = this.templateManager.createTemplate(name);
                this.renderTemplatesList();
                this.updateTemplateStats();
                this.loadTemplate(template.id);
            }
        });

        // Import Templates
        document.getElementById('btn-import-templates').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.bb2,.json';
            input.multiple = true; // Allow multiple file selection
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;

                this.importMultipleFiles(files);
            };
            input.click();
        });

        // Download All Templates
        document.getElementById('btn-download-all').addEventListener('click', () => {
            this.templateManager.downloadAllTemplates();
        });

        // Save Template
        document.getElementById('btn-save-template').addEventListener('click', () => {
            this.saveCurrentTemplate();
        });

        // Discard Changes
        document.getElementById('btn-discard-changes').addEventListener('click', () => {
            this.discardChanges();
        });

        // Search Templates
        document.getElementById('template-search').addEventListener('input', (e) => {
            this.renderTemplatesList(e.target.value);
        });

        // Drag and Drop functionality
        this.initDragAndDrop();
    }

    renderTemplatesList(searchQuery = '') {
        const container = document.getElementById('templates-list');
        const templates = searchQuery ? 
            this.templateManager.searchTemplates(searchQuery) : 
            this.templateManager.getAllTemplates();

        if (templates.length === 0) {
            container.innerHTML = `
                <div class="templates-empty">
                    <h3>No templates found</h3>
                    <p>${searchQuery ? 'Try a different search term' : 'Create your first template to get started'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = templates.map(template => {
            const isActive = template.id === this.currentTemplateId;
            const profile = template.profile;
            const scannerType = profile.scanner === 'active' ? 'active' : 'passive';
            const isEnabled = profile.enabled !== false;
            
            return `
                <div class="template-item ${isActive ? 'active' : ''}" data-template-id="${template.id}">
                    <div class="template-info">
                        <div class="template-name">${this.escapeHtml(template.name)}</div>
                        <div class="template-meta">
                            <span>Modified: ${new Date(template.modified).toLocaleDateString()}</span>
                            <span>Author: ${this.escapeHtml(profile.author || 'Unknown')}</span>
                            <span class="template-badge ${scannerType}">${scannerType}</span>
                            ${!isEnabled ? '<span class="template-badge disabled">disabled</span>' : ''}
                        </div>
                    </div>
                    <div class="template-actions-item">
                        <button class="btn small secondary" onclick="app.duplicateTemplate(${template.id})" title="Duplicate">⧉</button>
                        <button class="btn small secondary" onclick="app.downloadTemplate(${template.id})" title="Download">↓</button>
                        <button class="btn small danger" onclick="app.deleteTemplate(${template.id})" title="Delete">×</button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind click events for template items
        container.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.template-actions-item')) return;
                
                const templateId = parseInt(item.dataset.templateId);
                this.loadTemplate(templateId);
            });
        });
    }

    loadTemplate(templateId) {
        if (this.hasUnsavedChanges && !confirm('You have unsaved changes. Continue?')) {
            return;
        }

        const template = this.templateManager.getTemplate(templateId);
        if (template) {
            this.currentTemplateId = templateId;
            this.profile = JSON.parse(JSON.stringify(template.profile));
            this.hasUnsavedChanges = false;
            this.renderForm();
            this.updateJsonView(true); // Skip marking as changed
            this.updateCurrentTemplateInfo();
            this.renderTemplatesList();
            
            // Switch to profile editor page
            this.showPage('profile');
            
            // Save session state
            this.saveSessionState();
        }
    }

    saveCurrentTemplate() {
        if (this.currentTemplateId) {
            // Update existing template
            this.templateManager.updateTemplate(this.currentTemplateId, this.profile);
            this.hasUnsavedChanges = false;
            this.updateCurrentTemplateInfo();
            this.renderTemplatesList();
            this.updateTemplateStats();
            
            // Save session state
            this.saveSessionState();
        }
    }

    discardChanges() {
        if (this.hasUnsavedChanges && this.currentTemplateId) {
            if (confirm('Are you sure you want to discard all unsaved changes? This action cannot be undone.')) {
                // Reload the original template from storage
                const originalTemplate = this.templateManager.getTemplate(this.currentTemplateId);
                if (originalTemplate) {
                    this.profile = JSON.parse(JSON.stringify(originalTemplate.profile));
                    this.hasUnsavedChanges = false;
                    
                    // Update UI
                    this.renderForm();
                    this.updateJsonView(true); // Skip marking as changed
                    this.updateCurrentTemplateInfo();
                    this.saveToLocalStorage();
                    
                    // Save session state
                    this.saveSessionState();
                }
            }
        }
    }

    duplicateTemplate(templateId) {
        const duplicate = this.templateManager.duplicateTemplate(templateId);
        if (duplicate) {
            this.renderTemplatesList();
            this.updateTemplateStats();
            this.loadTemplate(duplicate.id);
        }
    }

    downloadTemplate(templateId) {
        this.templateManager.downloadTemplate(templateId);
    }

    deleteTemplate(templateId) {
        const template = this.templateManager.getTemplate(templateId);
        if (template && confirm(`Delete template "${template.name}"?`)) {
            this.templateManager.deleteTemplate(templateId);
            
            if (this.currentTemplateId === templateId) {
                this.currentTemplateId = null;
                this.profile = JSON.parse(JSON.stringify(defaultProfile));
                this.hasUnsavedChanges = false;
                this.renderForm();
                this.updateJsonView(true); // Skip marking as changed
                this.updateCurrentTemplateInfo();
                
                // Clear session state when current template is deleted
                this.saveSessionState();
            }
            
            this.renderTemplatesList();
            this.updateTemplateStats();
        }
    }

    updateCurrentTemplateInfo() {
        const info = document.getElementById('current-template-info');
        const saveBtn = document.getElementById('btn-save-template');
        const discardBtn = document.getElementById('btn-discard-changes');
        
        if (this.currentTemplateId) {
            // Editing a template
            const template = this.templateManager.getTemplate(this.currentTemplateId);
            const templateName = template ? template.name : 'Unknown Template';
            const changedIndicator = this.hasUnsavedChanges ? ' *' : '';
            
            info.querySelector('.template-name').textContent = templateName + changedIndicator;
            saveBtn.textContent = 'Save Changes';
            saveBtn.disabled = !this.hasUnsavedChanges;
            discardBtn.disabled = !this.hasUnsavedChanges;
        } else {
            // No template selected - should not happen with new workflow
            info.querySelector('.template-name').textContent = 'No template selected';
            saveBtn.disabled = true;
            discardBtn.disabled = true;
        }
    }

    updateTemplateStats() {
        const stats = this.templateManager.getStats();
        const container = document.getElementById('template-stats');
        
        container.innerHTML = `
            <div class="template-stat">
                <div class="template-stat-value">${stats.total}</div>
                <div>Total</div>
            </div>
            <div class="template-stat">
                <div class="template-stat-value">${stats.active}</div>
                <div>Active</div>
            </div>
            <div class="template-stat">
                <div class="template-stat-value">${stats.passive}</div>
                <div>Passive</div>
            </div>
            <div class="template-stat">
                <div class="template-stat-value">${stats.recent}</div>
                <div>Recent</div>
            </div>
        `;
    }

    async importMultipleFiles(files) {
        let totalImported = 0;
        let totalFiles = files.length;
        let errors = [];
        let totalConflicts = 0;

        // Show progress for multiple files
        if (files.length > 1) {
            console.log(`Importing ${files.length} files...`);
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const content = await this.readFileContent(file);
                const result = await this.importWithConflictHandling(content, file.name);
                totalImported += result.imported.length;
                totalConflicts += result.conflicts;
                
                if (files.length > 1) {
                    console.log(`Imported ${result.imported.length} template(s) from ${file.name}`);
                }
            } catch (err) {
                errors.push(`${file.name}: ${err.message}`);
            }
        }

        // Update UI
        this.renderTemplatesList();
        this.updateTemplateStats();

        // Show results
        let message = `Successfully imported ${totalImported} template(s) from ${totalFiles} file(s)`;
        
        if (totalConflicts > 0) {
            message += `\n${totalConflicts} conflict(s) were resolved`;
        }
        
        if (errors.length > 0) {
            message += `\n\nErrors encountered:\n${errors.join('\n')}`;
        }

        alert(message);
    }

    async importWithConflictHandling(content, fileName = '') {
        try {
            // First, try to import and see if there are conflicts
            const result = this.templateManager.importTemplates(content, async (conflicts) => {
                // Handle conflicts with user dialog
                return await this.showConflictDialog(conflicts, fileName);
            });
            
            return result;
        } catch (error) {
            throw error;
        }
    }

    async showConflictDialog(conflicts, fileName = '') {
        const decisions = {};
        const fileText = fileName ? ` from "${fileName}"` : '';
        let applyToAll = null;
        
        for (let i = 0; i < conflicts.length; i++) {
            const conflict = conflicts[i];
            const templateName = conflict.templateName;
            
            if (applyToAll) {
                decisions[templateName] = applyToAll;
                continue;
            }
            
            const message = `Template "${templateName}"${fileText} already exists.`;
            const isLast = i === conflicts.length - 1;
            
            const result = await this.showCustomConflictDialog(templateName, message, !isLast);
            
            if (result.applyToAll) {
                applyToAll = result.action;
                decisions[templateName] = result.action;
                
                // Apply to remaining conflicts
                for (let j = i + 1; j < conflicts.length; j++) {
                    decisions[conflicts[j].templateName] = result.action;
                }
                break;
            } else {
                decisions[templateName] = result.action;
            }
        }
        
        return decisions;
    }

    showCustomConflictDialog(templateName, message, showApplyToAll = false) {
        return new Promise((resolve) => {
            const modal = document.getElementById('conflict-modal');
            const messageEl = document.getElementById('conflict-message');
            const applyBtn = document.getElementById('btn-conflict-apply');
            const applyAllBtn = document.getElementById('btn-conflict-apply-all');
            
            // Set message
            messageEl.textContent = message;
            
            // Show/hide "Apply to All" button
            applyAllBtn.style.display = showApplyToAll ? 'inline-block' : 'none';
            
            // Reset radio buttons
            document.getElementById('conflict-rename').checked = true;
            
            // Show modal
            modal.style.display = 'flex';
            
            const handleAction = (applyToAll = false) => {
                const selectedAction = document.querySelector('input[name="conflict-action"]:checked').value;
                modal.style.display = 'none';
                resolve({
                    action: selectedAction,
                    applyToAll: applyToAll
                });
            };
            
            // Event listeners
            const applyHandler = () => handleAction(false);
            const applyAllHandler = () => handleAction(true);
            
            applyBtn.addEventListener('click', applyHandler, { once: true });
            applyAllBtn.addEventListener('click', applyAllHandler, { once: true });
            
            // Close on escape
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.style.display = 'none';
                    resolve({ action: 'rename', applyToAll: false });
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    initDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        let dragCounter = 0;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Show drop zone when dragging files over the window
        document.addEventListener('dragenter', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                dragCounter++;
                dropZone.style.display = 'flex';
            }
        });

        document.addEventListener('dragleave', (e) => {
            dragCounter--;
            if (dragCounter === 0) {
                dropZone.style.display = 'none';
                dropZone.classList.remove('drag-over');
            }
        });

        // Handle drag over drop zone
        dropZone.addEventListener('dragover', (e) => {
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        });

        // Handle file drop
        dropZone.addEventListener('drop', (e) => {
            dragCounter = 0;
            dropZone.style.display = 'none';
            dropZone.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.name.endsWith('.bb2') || file.name.endsWith('.json')
            );

            if (files.length > 0) {
                this.importMultipleFiles(files);
            } else {
                alert('Please drop only .bb2 or .json files');
            }
        });

        // Hide drop zone when clicking outside
        dropZone.addEventListener('click', (e) => {
            if (e.target === dropZone) {
                dragCounter = 0;
                dropZone.style.display = 'none';
                dropZone.classList.remove('drag-over');
            }
        });
    }

    showPage(pageName) {
        // Update navigation buttons
        document.querySelectorAll('.page-nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.classList.contains('primary')) {
                btn.classList.remove('primary');
                btn.classList.add('secondary');
            }
        });

        // Hide all pages
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // Show selected page and update button
        if (pageName === 'templates') {
            document.getElementById('templates-page').classList.add('active');
            const btn = document.getElementById('btn-show-templates');
            btn.classList.add('active', 'primary');
            btn.classList.remove('secondary');
        } else if (pageName === 'profile') {
            document.getElementById('profile-page').classList.add('active');
            const btn = document.getElementById('btn-show-profile');
            btn.classList.add('active', 'primary');
            btn.classList.remove('secondary');
        }
        
        // Save session state when page changes
        this.saveSessionState();
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return text || '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make app globally accessible for onclick handlers
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
