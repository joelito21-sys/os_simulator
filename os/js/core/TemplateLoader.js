/**
 * TemplateLoader.js
 * Responsible for fetching and preparing HTML templates for applications.
 */
class TemplateLoader {
    constructor() {
        this.templates = new Map();
        this.templatePath = 'templates/';
    }

    /**
     * Load all required templates from the templates directory.
     * @param {string[]} templateIds 
     */
    async loadAll(templateIds) {
        const promises = templateIds.map(id => this.load(id));
        await Promise.all(promises);
    }

    /**
     * Load a single template by ID.
     * @param {string} id 
     */
    async load(id) {
        if (this.templates.has(id)) return this.templates.get(id);

        try {
            const response = await fetch(`${this.templatePath}${id}.html`);
            if (!response.ok) throw new Error(`Template not found: ${id}`);

            const html = await response.text();

            // Create a template element to store the fetched HTML
            const template = document.createElement('template');
            template.id = id + 'Template';
            template.innerHTML = html.trim();
            document.body.appendChild(template);

            this.templates.set(id, template);
            return template;
        } catch (error) {
            console.error(`Failed to load template ${id}:`, error);
            // Fallback for critical templates if needed
            return null;
        }
    }

    /**
     * Get a cloned version of the template content.
     * @param {string} id 
     */
    getTemplateContent(id) {
        const template = document.getElementById(`${id}Template`);
        if (!template) {
            console.error(`Template ${id}Template not found in DOM.`);
            return null;
        }
        return template.content.cloneNode(true);
    }
}

export default new TemplateLoader();
