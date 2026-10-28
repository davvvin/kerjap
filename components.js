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
                        <a href="linkedlist-headtail.html">Singly (Head &amp; Tail)</a>
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

        // --- THEME TOGGLE ---
        const themeBtn = this.querySelector('#themeBtn');
        const root = document.documentElement;
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            root.setAttribute('data-theme', 'light');
            themeBtn.textContent = 'Dark Mode';
        }
        themeBtn.addEventListener('click', () => {
            const isLight = root.getAttribute('data-theme') === 'light';
            if (isLight) {
                root.removeAttribute('data-theme');
                localStorage.setItem('theme', 'dark');
                themeBtn.textContent = 'Light Mode';
            } else {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeBtn.textContent = 'Dark Mode';
            }
            window.dispatchEvent(new Event('themeChanged'));
        });

        // --- ACTIVE STATE ---
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        this.querySelectorAll('a.sidebar-link').forEach(link => {
            if (link.getAttribute('href') === currentPath) link.classList.add('active');
        });
        this.querySelectorAll('.sidebar-group-items a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
                const group = link.closest('.sidebar-group');
                group.classList.add('open', 'has-active');
            }
        });

        // --- GROUP COLLAPSE ---
        this.querySelectorAll('.sidebar-group-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                btn.closest('.sidebar-group').classList.toggle('open');
            });
        });

        // --- SIDEBAR COLLAPSE ---
        let collapseBtn = document.getElementById('sidebarCollapseBtn');
        if (!collapseBtn) {
            collapseBtn = document.createElement('button');
            collapseBtn.id = 'sidebarCollapseBtn';
            collapseBtn.className = 'sidebar-collapse-btn';
            collapseBtn.title = 'Collapse sidebar';
            collapseBtn.innerHTML = '&#8249;';
            document.body.appendChild(collapseBtn);
        }

        const applyCollapse = (collapsed) => {
            root.classList.toggle('sidebar-collapsed', collapsed);
            collapseBtn.innerHTML = collapsed ? '&#8250;' : '&#8249;';
            collapseBtn.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
        };
        applyCollapse(localStorage.getItem('sidebarCollapsed') === 'true');
        collapseBtn.onclick = () => {
            const next = !root.classList.contains('sidebar-collapsed');
            applyCollapse(next);
            localStorage.setItem('sidebarCollapsed', next);
        };

        // --- MOBILE HAMBURGER ---
        const hamburger = document.createElement('button');
        hamburger.className = 'sidebar-hamburger';
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        hamburger.addEventListener('click', () => this.classList.toggle('open'));
        document.body.prepend(hamburger);

        this.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) this.classList.remove('open');
            });
        });
    }
}
customElements.define('nav-bar', NavBar);

class EngineControls extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <div class="eng-ctrl-bar">
                <button id="btnPrev" onclick="animEngine.prev()" disabled title="Previous step">&#9664;</button>
                <button id="btnAuto" onclick="animEngine.toggleAuto()" disabled title="Play / Pause">&#9654; Auto</button>
                <button id="btnNext" onclick="animEngine.next()" disabled title="Next step">&#9654;&#9654;</button>
                <span id="stepCounter" class="eng-step-counter" style="display:none">0/0</span>
                <label class="eng-step-label" title="Step-by-step mode">
                    <input type="checkbox" id="chkStepByStep" checked> Step
                </label>
            </div>
        `;
    }
}
customElements.define('engine-controls', EngineControls);
