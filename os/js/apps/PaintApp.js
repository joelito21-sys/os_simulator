class PaintApp {
    constructor(element) {
        this.element = element;
        this.canvas = element.querySelector('#paintCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.colorInput = element.querySelector('#paintColor');
        this.brushInput = element.querySelector('#paintBrush');
        this.clearBtn = element.querySelector('#paintClear');
        this.saveBtn = element.querySelector('#paintSave');

        this.drawing = false;
        this.init();
    }

    init() {
        this.canvas.width = 760;
        this.canvas.height = 500;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            });
        }

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = 'drawing.png';
                link.href = this.canvas.toDataURL();
                link.click();
                if (window.app) window.app.notify('Drawing saved to your computer');
            });
        }
    }

    startDrawing(e) {
        this.drawing = true;
        this.draw(e);
    }

    draw(e) {
        if (!this.drawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.lineWidth = this.brushInput.value;
        this.ctx.strokeStyle = this.colorInput.value;

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    stopDrawing() {
        this.drawing = false;
        this.ctx.beginPath();
    }
}

export default PaintApp;
