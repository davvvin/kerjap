if (!document.getElementById('algomotion-fonts')) {
  const l = document.createElement('link');
  l.id = 'algomotion-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';
  document.head.appendChild(l);
}

class NavBar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="sidebar-brand"><span class="brand-accent">Algo</span>Motion</div>
            <nav class="sidebar-nav">
                <a href="index.html" class="sidebar-link">Home</a>
                <a href="array.html" class="sidebar-link">Arrays</a>

                <div class="sidebar-group">
                    <button class="sidebar-group-toggle">Stacks</button>
                    <div class="sidebar-group-items">
                        <a href="stack-array.html">Stack (Array)</a>
                        <a href="stack-linkedlist.html">Stack (Linked List)</a>
                    </div>
                </div>

                <div class="sidebar-group">
                    <button class="sidebar-group-toggle">Queues</button>
                    <div class="sidebar-group-items">
                        <a href="queue-array.html">Queue (Array)</a>
                        <a href="queue-linkedlist.html">Queue (Linked List)</a>
                    </div>
                </div>

                <div class="sidebar-group">
                    <button class="sidebar-group-toggle">Linked Lists</button>
                    <div class="sidebar-group-items">
                        <a href="linkedlist.html">Singly Linked List</a>
                        <a href="linkedlist-headtail.html">Singly (Head & Tail)</a>
                        <a href="linkedlist-doubly.html">Doubly Linked List</a>
                        <a href="linkedlist-circular.html">Circular Linked List</a>
                    </div>
                </div>

                <div class="sidebar-group">
                    <button class="sidebar-group-toggle">Trees</button>
                    <div class="sidebar-group-items">
                        <a href="tree.html">Binary Search Tree</a>
                        <a href="tree-avl.html">AVL Tree</a>
                        <a href="tree-nary.html">N-Ary Tree</a>
                        <a href="tree-maxheap.html">Max Heap</a>
                        <a href="tree-minheap.html">Min Heap</a>
                    </div>
                </div>
            </nav>
            <div class="sidebar-footer">
                <button class="theme-toggle" id="themeBtn">Light Mode</button>
            </div>
        `;

        // --- THEME TOGGLE LOGIC ---
        const themeBtn = this.querySelector('#themeBtn');
        const root = document.documentElement;
        
        // Cek LocalStorage untuk melihat apakah user pernah memilih tema
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            root.setAttribute('data-theme', 'light');
            themeBtn.textContent = 'Dark Mode';
        }

        themeBtn.addEventListener('click', () => {
            const currentTheme = root.getAttribute('data-theme');
            if (currentTheme === 'light') {
                root.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
                themeBtn.textContent = 'Light Mode';
            } else {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeBtn.textContent = 'Dark Mode';
            }
            
            // Dispatch custom event so the canvases can redraw themselves with new colors
            window.dispatchEvent(new Event('themeChanged'));
        });

        // --- ACTIVE STATE LOGIC ---
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        
        // Check sidebar links
        const links = this.querySelectorAll('a.sidebar-link');
        links.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Check links inside groups
        const groupLinks = this.querySelectorAll('.sidebar-group-items a');
        groupLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
                // Auto-expand the parent group and mark it
                const group = link.closest('.sidebar-group');
                group.classList.add('open');
                group.classList.add('has-active');
            }
        });

        // --- COLLAPSIBLE GROUP TOGGLE ---
        const groupBtns = this.querySelectorAll('.sidebar-group-toggle');
        groupBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const group = btn.closest('.sidebar-group');
                group.classList.toggle('open');
            });
        });

        // --- MOBILE HAMBURGER ---
        const hamburger = document.createElement('button');
        hamburger.className = 'sidebar-hamburger';
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        hamburger.addEventListener('click', () => {
            this.classList.toggle('open');
        });
        document.body.prepend(hamburger);

        // Close sidebar on mobile when clicking a link
        const allLinks = this.querySelectorAll('a');
        allLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    this.classList.remove('open');
                }
            });
        });
    }
}

customElements.define('nav-bar', NavBar);

class EngineControls extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div style="background: var(--panel-bg); padding: 8px; border-top: 1px solid var(--panel-border); display: flex; justify-content: center; align-items: center; gap: 12px;">
                <label style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; cursor: pointer;">
                    <input type="checkbox" id="chkStepByStep"> Step-by-step
                </label>
                <button id="btnPrev" onclick="animEngine.prev()" disabled
                    style="padding: 4px 10px; font-size: 12px; background: var(--panel-bg-soft); color: var(--text-main); border: 1px solid var(--panel-border);">
                    Prev</button>
                <button id="btnAuto" onclick="animEngine.toggleAuto()" disabled
                    style="padding: 4px 10px; font-size: 12px; background: var(--panel-bg-soft); color: var(--text-main); border: 1px solid var(--panel-border);">
                    Auto</button>
                <button id="btnNext" onclick="animEngine.next()" disabled
                    style="padding: 4px 10px; font-size: 12px; background: var(--panel-bg-soft); color: var(--text-main); border: 1px solid var(--panel-border);">
                    Next</button>
            </div>
        `;
    }
}

customElements.define('engine-controls', EngineControls);
