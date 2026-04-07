class BrowserApp {
    constructor(element) {
        this.element = element;
        this.iframe = element.querySelector('#browserIframe');
        this.urlInput = element.querySelector('#browserUrl');
        this.bindEvents();
    }

    bindEvents() {
        if (this.urlInput) {
            this.urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    let url = this.urlInput.value;
                    if (!url.startsWith('http')) url = 'https://' + url;
                    if (this.iframe) this.iframe.src = url;
                }
            });
        }
        const refreshBtn = this.element.querySelector('#browserRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.iframe) this.iframe.src = this.iframe.src;
            });
        }
    }
}

export default BrowserApp;
