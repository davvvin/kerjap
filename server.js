/**
 * AlgoMotion Local Code Runner
 * ─────────────────────────────
 * Runs Java code locally using the machine's installed JDK.
 * If javac is not detected, it immediately reports JDK_NOT_INSTALLED so
 * the browser frontend can fall back to the Cloud compiler without freezing.
 *
 * Requirements:
 *   - Node.js (any version >= 14)
 *   - Java JDK installed and `javac`/`java` on PATH
 *
 * Start: node server.js
 * Default port: 3001
 */

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3001;
const TIMEOUT_MS = 8000;

let hasJavac = false;

// Check if javac is available at startup
function checkJavac() {
    exec('javac -version', (err) => {
        hasJavac = !err;
        if (hasJavac) {
            console.log('✓ Java JDK compiler (javac) detected.');
        } else {
            console.log('! javac is not in PATH. Local runner will notify browser to use Cloud API.');
        }
    });
}
checkJavac();

function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function runCmd(cmd, cwd, timeoutMs) {
    return new Promise((resolve) => {
        exec(cmd, { cwd, timeout: timeoutMs }, (err, stdout, stderr) => {
            resolve({ stdout: stdout || '', stderr: stderr || (err && err.message) || '' });
        });
    });
}

async function runJava(code) {
    if (!hasJavac) {
        return {
            stdout: '',
            stderr: "JDK_NOT_INSTALLED: 'javac' is not installed or not in PATH."
        };
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'algomotion-'));
    const srcFile = path.join(tmpDir, 'StackArray.java');
    fs.writeFileSync(srcFile, code, 'utf8');

    try {
        const compile = await runCmd(`javac "${srcFile}"`, tmpDir, TIMEOUT_MS);
        if (compile.stderr && compile.stderr.trim()) {
            return { stdout: '', stderr: compile.stderr };
        }

        const run = await runCmd(`java -cp "${tmpDir}" StackArray`, tmpDir, TIMEOUT_MS);
        return run;
    } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
}

const server = http.createServer(async (req, res) => {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/run/java') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            let code = '';
            try { code = JSON.parse(body).code || ''; }
            catch { code = body; }

            if (!code.trim()) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No code provided' }));
                return;
            }

            const result = await runJava(code);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                stdout: result.stdout,
                stderr: result.stderr
            }));
        });
        return;
    }

    if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', hasJavac }));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`AlgoMotion Code Runner listening on http://localhost:${PORT}`);
});
