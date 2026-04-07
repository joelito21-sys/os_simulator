class CalculatorApp {
    constructor(element) {
        this.element = element;
        this.display = element.querySelector('#calcInput');
        this.bindEvents();
    }

    bindEvents() {
        this.element.querySelectorAll('.num').forEach(btn => {
            btn.addEventListener('click', () => this.appendNumber(btn.textContent));
        });
        this.element.querySelectorAll('.op').forEach(btn => {
            btn.addEventListener('click', () => this.appendOperator(btn.textContent));
        });
        this.element.querySelector('.equals').addEventListener('click', () => this.calculate());
        this.element.querySelector('.clear').addEventListener('click', () => this.clear());
        this.element.querySelector('.back').addEventListener('click', () => this.backspace());
    }

    appendNumber(num) {
        if (this.display.value === '0') this.display.value = num;
        else this.display.value += num;
    }

    appendOperator(op) {
        this.display.value += ` ${op} `;
    }

    calculate() {
        try {
            this.display.value = eval(this.display.value);
        } catch (e) {
            this.display.value = 'Error';
        }
    }

    clear() {
        this.display.value = '0';
    }

    backspace() {
        this.display.value = this.display.value.slice(0, -1) || '0';
    }
}

export default CalculatorApp;
