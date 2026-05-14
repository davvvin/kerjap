class AnimEngine {
    constructor(applyStateCallback) {
        this.steps = [];
        this.currentStep = -1;
        this.autoTimer = null;
        this.applyStateCallback = applyStateCallback;
    }

    loadSteps(stepsObj) {
        const chkStepByStep = document.getElementById('chkStepByStep');
        const isStepByStep = chkStepByStep ? chkStepByStep.checked : true;
        
        if (isStepByStep || stepsObj.length <= 1) {
            this.steps = stepsObj;
        } else {
            let finalStep = { ...stepsObj[stepsObj.length - 1] };
            finalStep.line = ""; // hapus highlight spesifik untuk tampilan instan
            this.steps = [finalStep];
        }

        this.currentStep = -1;
        this.stopAuto();
        
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnAuto = document.getElementById('btnAuto');

        if (btnPrev) btnPrev.disabled = true;
        
        const hasNext = this.steps.length > 1;
        if (btnNext) btnNext.disabled = !hasNext;
        if (btnAuto) btnAuto.disabled = !hasNext;
        if (btnAuto) btnAuto.textContent = '▶️ Auto';
        
        this.next();
    }

    applyStep() {
        if (this.currentStep < 0 || this.currentStep >= this.steps.length) return;
        const step = this.steps[this.currentStep];

        // 1. Terapkan state ke kanvas masing-masing struktur data
        if (this.applyStateCallback) {
            this.applyStateCallback(step);
        }

        // 2. Perbarui tampilan kode
        const pre = document.getElementById('codePre');
        const codeDisplay = document.getElementById('codeDisplay');

        if (pre) {
            if (step.line) {
                pre.setAttribute('data-line', step.line);
            } else {
                pre.removeAttribute('data-line');
            }
        }

        if (codeDisplay && step.code !== undefined) {
            codeDisplay.textContent = step.code;
            if (window.Prism) Prism.highlightElement(codeDisplay);
        }

        // 3. Perbarui pesan status
        const msgEl = document.getElementById('msg');
        if (msgEl && step.msg) {
            msgEl.textContent = step.msg;
        }

        // 4. Perbarui status tombol navigasi
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        
        if (btnPrev) btnPrev.disabled = (this.currentStep === 0);
        if (btnNext) btnNext.disabled = (this.currentStep === this.steps.length - 1);

        if (this.currentStep === this.steps.length - 1) {
            this.stopAuto();
        }
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.applyStep();
        }
    }

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.applyStep();
        }
    }

    toggleAuto() {
        const btnAuto = document.getElementById('btnAuto');
        if (this.autoTimer) {
            this.stopAuto();
        } else {
            if (this.currentStep === this.steps.length - 1) return;
            if (btnAuto) btnAuto.textContent = '⏸ Pause';
            this.autoTimer = setInterval(() => {
                this.next();
            }, 1000);
        }
    }

    stopAuto() {
        const btnAuto = document.getElementById('btnAuto');
        if (this.autoTimer) clearInterval(this.autoTimer);
        this.autoTimer = null;
        if (btnAuto) btnAuto.textContent = '▶️ Auto';
    }
}
