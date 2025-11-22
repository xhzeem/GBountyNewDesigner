class TemplateManager {
    constructor() {
        this.templates = this.loadTemplatesFromStorage() || [];
        this.currentTemplateId = null;
        this.nextId = this.getNextId();
    }

    // Generate unique ID for new templates
    getNextId() {
        const maxId = this.templates.reduce((max, template) => Math.max(max, template.id || 0), 0);
        return maxId + 1;
    }

    // Create a new template
    createTemplate(name = 'New Template') {
        const newTemplate = {
            id: this.nextId++,
            name: name,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            profile: JSON.parse(JSON.stringify(defaultProfile))
        };
        
        // Set the profile name to match template name
        newTemplate.profile.profile_name = name;
        
        this.templates.push(newTemplate);
        this.saveTemplates();
        return newTemplate;
    }

    // Get template by ID
    getTemplate(id) {
        return this.templates.find(t => t.id === id);
    }

    // Update template
    updateTemplate(id, profile) {
        const template = this.getTemplate(id);
        if (template) {
            template.profile = JSON.parse(JSON.stringify(profile));
            template.modified = new Date().toISOString();
            // Update template name if profile name changed
            if (profile.profile_name && profile.profile_name !== template.name) {
                template.name = profile.profile_name;
            }
            this.saveTemplates();
            return template;
        }
        return null;
    }

    // Delete template
    deleteTemplate(id) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index !== -1) {
            this.templates.splice(index, 1);
            this.saveTemplates();
            return true;
        }
        return false;
    }

    // Duplicate template
    duplicateTemplate(id) {
        const original = this.getTemplate(id);
        if (original) {
            const duplicate = {
                id: this.nextId++,
                name: original.name + ' (Copy)',
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                profile: JSON.parse(JSON.stringify(original.profile))
            };
            duplicate.profile.profile_name = duplicate.name;
            this.templates.push(duplicate);
            this.saveTemplates();
            return duplicate;
        }
        return null;
    }

    // Get all templates
    getAllTemplates() {
        return [...this.templates];
    }

    // Search templates
    searchTemplates(query) {
        if (!query) return this.getAllTemplates();
        
        const lowerQuery = query.toLowerCase();
        return this.templates.filter(template => 
            template.name.toLowerCase().includes(lowerQuery) ||
            template.profile.profile_name.toLowerCase().includes(lowerQuery) ||
            (template.profile.author && template.profile.author.toLowerCase().includes(lowerQuery))
        );
    }

    // Export single template
    exportTemplate(id) {
        const template = this.getTemplate(id);
        if (template) {
            return JSON.stringify([template.profile], null, 2);
        }
        return null;
    }

    // Export all templates
    exportAllTemplates() {
        const profiles = this.templates.map(t => t.profile);
        return JSON.stringify(profiles, null, 2);
    }

    // Import templates from JSON
    async importTemplates(jsonData, overrideCallback = null) {
        try {
            const data = JSON.parse(jsonData);
            const profiles = Array.isArray(data) ? data : [data];
            
            const imported = [];
            const conflicts = [];
            
            // First pass: identify conflicts
            profiles.forEach((profile, index) => {
                if (profile && typeof profile === 'object') {
                    const templateName = profile.profile_name || 'Imported Template';
                    const existingTemplate = this.templates.find(t => t.name === templateName);
                    
                    if (existingTemplate) {
                        conflicts.push({
                            index,
                            profile,
                            templateName,
                            existingTemplate
                        });
                    }
                }
            });
            
            // Handle conflicts if callback is provided
            if (conflicts.length > 0 && overrideCallback) {
                const decisions = await overrideCallback(conflicts);
                
                // Process based on decisions
                profiles.forEach((profile, index) => {
                    if (profile && typeof profile === 'object') {
                        const templateName = profile.profile_name || 'Imported Template';
                        const conflict = conflicts.find(c => c.index === index);
                        
                        if (conflict) {
                            const decision = decisions[conflict.templateName];
                            if (decision === 'override') {
                                // Override existing template
                                const existingTemplate = conflict.existingTemplate;
                                existingTemplate.profile = { ...profile, profile_name: templateName };
                                existingTemplate.modified = new Date().toISOString();
                                imported.push(existingTemplate);
                            } else if (decision === 'rename') {
                                // Create with new name
                                let newName = templateName;
                                let counter = 1;
                                while (this.templates.some(t => t.name === newName)) {
                                    newName = `${templateName} (${counter})`;
                                    counter++;
                                }
                                
                                const template = {
                                    id: this.nextId++,
                                    name: newName,
                                    created: new Date().toISOString(),
                                    modified: new Date().toISOString(),
                                    profile: { ...profile, profile_name: newName }
                                };
                                this.templates.push(template);
                                imported.push(template);
                            }
                            // If decision is 'skip', do nothing
                        } else {
                            // No conflict, add normally
                            const template = {
                                id: this.nextId++,
                                name: templateName,
                                created: new Date().toISOString(),
                                modified: new Date().toISOString(),
                                profile: { ...profile, profile_name: templateName }
                            };
                            this.templates.push(template);
                            imported.push(template);
                        }
                    }
                });
            } else {
                // No conflicts or no callback, process normally with auto-rename
                profiles.forEach((profile, index) => {
                    if (profile && typeof profile === 'object') {
                        let templateName = profile.profile_name || 'Imported Template';
                        const originalName = templateName;
                        let counter = 1;
                        
                        // Auto-rename if conflicts exist and no callback provided
                        while (this.templates.some(t => t.name === templateName)) {
                            templateName = `${originalName} (${counter})`;
                            counter++;
                        }
                        
                        const template = {
                            id: this.nextId++,
                            name: templateName,
                            created: new Date().toISOString(),
                            modified: new Date().toISOString(),
                            profile: { ...profile, profile_name: templateName }
                        };
                        this.templates.push(template);
                        imported.push(template);
                    }
                });
            }
            
            this.saveTemplates();
            return { imported, conflicts: conflicts.length };
        } catch (error) {
            throw new Error('Invalid JSON format: ' + error.message);
        }
    }

    // Download single template
    downloadTemplate(id, filename) {
        const json = this.exportTemplate(id);
        if (json) {
            const template = this.getTemplate(id);
            const name = filename || (template.name + '.bb2');
            this.downloadFile(json, name);
        }
    }

    // Download all templates
    downloadAllTemplates(filename = 'all-templates.bb2') {
        const json = this.exportAllTemplates();
        this.downloadFile(json, filename);
    }

    // Utility function to trigger file download
    downloadFile(content, filename) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    // Save templates to localStorage
    saveTemplates() {
        try {
            localStorage.setItem('gbounty-templates', JSON.stringify(this.templates));
        } catch (error) {
            console.error('Failed to save templates:', error);
        }
    }

    // Load templates from localStorage
    loadTemplatesFromStorage() {
        try {
            const saved = localStorage.getItem('gbounty-templates');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Failed to load templates:', error);
            return null;
        }
    }

    // Clear all templates (with confirmation)
    clearAllTemplates() {
        this.templates = [];
        this.saveTemplates();
    }

    // Get template statistics
    getStats() {
        return {
            total: this.templates.length,
            active: this.templates.filter(t => t.profile.enabled !== false).length,
            passive: this.templates.filter(t => t.profile.scanner !== 'active').length,
            recent: this.templates.filter(t => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(t.modified) > weekAgo;
            }).length
        };
    }
}
