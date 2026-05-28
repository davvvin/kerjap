if (!document.getElementById('algomotion-fonts')) {
  const l = document.createElement('link');
  l.id = 'algomotion-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';
  document.head.appendChild(l);
}
class NavBar extends HTMLElement {
    connectedCallback() {
        // --- BAGIAN INI SANGAT MUDAH DIEDIT ---
        // Anda cukup mengganti HTML di dalam tanda kutip backtick (`) ini.
        // Jika Anda ingin menambah menu baru, cukup copy-paste tag <a> atau <div class="dropdown">!
        
        this.innerHTML = `
            <div class="top-navbar">
                <a href="index.html" class="nav-link">Home</a>
                <a href="array.html" class="nav-link">Arrays</a>
                
                <!-- Dropdown untuk Stacks -->
                <div class="dropdown">
                    <button class="nav-link dropdown-btn">Stacks ↓</button>
                    <div class="dropdown-content">
                        <a href="stack-array.html">Stack (Array)</a>
                        <a href="stack-linkedlist.html">Stack (Linked List)</a>
                    </div>
                </div>

                <!-- Dropdown untuk Queues -->
                <div class="dropdown">
                    <button class="nav-link dropdown-btn">Queues ↓</button>
                    <div class="dropdown-content">
                        <a href="queue-array.html">Queue (Array)</a>
                        <a href="queue-linkedlist.html">Queue (Linked List)</a>
                    </div>
                </div>

                <a href="linkedlist.html" class="nav-link">Linked Lists</a>
                <div class="dropdown">
                    <button class="nav-link dropdown-btn">Trees ↓</button>
                    <div class="dropdown-content">
                        <a href="tree.html">Binary Tree</a>
                        <a href="tree-avl.html">AVL Tree</a>
                        <a href="tree-nary.html">N-Ary Tree</a>
                        <a href="tree-maxheap.html">Max Heap</a>
                        <a href="tree-minheap.html">Min Heap</a>
                    </div>
                </div>
                
                <button class="theme-toggle" id="themeBtn" title="Toggle Light/Dark Mode">☀️</button>
            </div>
        `;

        // --- THEME TOGGLE LOGIC ---
        const themeBtn = this.querySelector('#themeBtn');
        const root = document.documentElement;
        
        // Cek LocalStorage untuk melihat apakah user pernah memilih tema
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            root.setAttribute('data-theme', 'light');
            themeBtn.textContent = '🌙';
        }

        themeBtn.addEventListener('click', () => {
            const currentTheme = root.getAttribute('data-theme');
            if (currentTheme === 'light') {
                root.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
                themeBtn.textContent = '☀️';
            } else {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeBtn.textContent = '🌙';
            }
            
            // Dispatch custom event so the canvases can redraw themselves with new colors
            window.dispatchEvent(new Event('themeChanged'));
        });

        // --- LOGIKA AKTIF OTOMATIS (TIDAK PERLU DIUBAH) ---
        // Kode di bawah ini hanya untuk membuat tombol bercahaya biru 
        // saat Anda sedang berada di halaman tersebut.
        const currentPath = window.location.pathname.split('/').pop();
        
        // Cek link tunggal
        const links = this.querySelectorAll('a.nav-link');
        links.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Cek link di dalam dropdown
        const dropdownContents = this.querySelectorAll('.dropdown-content a');
        dropdownContents.forEach(subLink => {
            if (subLink.getAttribute('href') === currentPath) {
                subLink.classList.add('active');
                // Beri efek aktif juga pada tombol dropdown utamanya (induknya)
                const parentBtn = subLink.closest('.dropdown').querySelector('.dropdown-btn');
                parentBtn.classList.add('active');
            }
        });
    }
}

customElements.define('nav-bar', NavBar);

class EngineControls extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div style="background: var(--panel-bg); padding: 8px; border-top: 1px solid var(--panel-border); display: flex; justify-content: center; align-items: center; gap: 12px;">
                <label style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input type="checkbox" id="chkStepByStep" checked> Step-by-step
                </label>
                <button id="btnPrev" onclick="animEngine.prev()" disabled
                    style="padding: 4px 10px; font-size: 12px; background: var(--input-bg); color: var(--text-main); border: 1px solid var(--panel-border);">⏮
                    Prev</button>
                <button id="btnAuto" onclick="animEngine.toggleAuto()" disabled
                    style="padding: 4px 10px; font-size: 12px; background: var(--input-bg); color: var(--text-main); border: 1px solid var(--panel-border);">▶️
                    Auto</button>
                <button id="btnNext" onclick="animEngine.next()" disabled
                    style="padding: 4px 10px; font-size: 12px; background: var(--input-bg); color: var(--text-main); border: 1px solid var(--panel-border);">⏭
                    Next</button>
            </div>
        `;
    }
}

customElements.define('engine-controls', EngineControls);
