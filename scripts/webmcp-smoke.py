#!/usr/bin/env python3
"""End-to-end smoke test of Sightline's WebMCP surface through Chrome's *native*
WebMCP DevTools domain — the same path an external agent uses, not an in-page shim.

    python3 scripts/webmcp-smoke.py [url]          # default: https://sightline-5vu.pages.dev
    pip install websocket-client                    # only dependency

Requires Google Chrome 151+ at the default macOS/Linux path (override with CHROME=...).
Exit code 0 = every invariant below held; 1 = a check failed.
"""
import json, os, shutil, subprocess, sys, time, urllib.request
try:
    import websocket  # type: ignore
except ImportError:
    sys.exit("pip install websocket-client")

URL = sys.argv[1] if len(sys.argv) > 1 else "https://sightline-5vu.pages.dev"
CHROME = os.environ.get("CHROME") or next(
    (p for p in ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", shutil.which("google-chrome") or ""] if p and os.path.exists(p)),
    None,
)
if not CHROME:
    sys.exit("Chrome not found; set CHROME=/path/to/chrome")
PORT = 9377
PROFILE = f"/tmp/sightline-smoke-{PORT}"


class CDP:
    def __init__(self):
        self.proc = subprocess.Popen(
            [CHROME, "--headless=new", f"--remote-debugging-port={PORT}", "--remote-allow-origins=*", "--window-size=1600,1000",
             "--enable-features=WebMCP,WebMCPTesting", "--no-first-run", "--no-default-browser-check", f"--user-data-dir={PROFILE}", URL],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(80):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
                page = next(t for t in tabs if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.25)
        else:
            raise SystemExit("Chrome did not expose a page target")
        self.ws = websocket.create_connection(page["webSocketDebuggerUrl"], origin=f"http://127.0.0.1:{PORT}", suppress_origin=False)
        self.ws.settimeout(1.0)
        self.mid = 0
        self.events = []

    def send(self, method, **params):
        self.mid += 1
        mid = self.mid
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            m = self.recv()
            if m and m.get("id") == mid:
                if "error" in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})

    def recv(self):
        try:
            m = json.loads(self.ws.recv())
        except websocket.WebSocketTimeoutException:
            return None
        if "method" in m:
            self.events.append(m)
        return m

    def pump(self, secs):
        end = time.time() + secs
        while time.time() < end:
            self.recv()

    def take(self, method):
        out = [e for e in self.events if e["method"] == method]
        self.events = [e for e in self.events if e["method"] != method]
        return out

    def eval(self, expr):
        return self.send("Runtime.evaluate", expression=expr, awaitPromise=True, returnByValue=True).get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()
            shutil.rmtree(PROFILE, ignore_errors=True)


def parse(o):
    if isinstance(o, str):
        try:
            return json.loads(o)
        except Exception:
            return o
    return o


failures = []


def check(cond, label):
    print(("  ✓ " if cond else "  ✗ ") + label)
    if not cond:
        failures.append(label)


c = CDP()
try:
    c.send("Page.enable"); c.send("Runtime.enable"); c.send("WebMCP.enable")
    frame = c.send("Page.getFrameTree")["frameTree"]["frame"]["id"]
    c.pump(4.0)
    tools = {}
    def harvest():
        for e in c.take("WebMCP.toolsAdded"):
            for t in e["params"]["tools"]:
                tools[t["name"]] = t.get("annotations") or {}
    harvest()

    def call(name, inp=None, wait=True, timeout=40):
        inv = c.send("WebMCP.invokeTool", frameId=frame, toolName=name, input=inp or {})["invocationId"]
        if not wait:
            return inv
        return await_(inv, timeout)

    def await_(inv, timeout=40):
        end = time.time() + timeout
        while time.time() < end:
            c.pump(0.05)
            for e in c.take("WebMCP.toolResponded"):
                if e["params"]["invocationId"] == inv:
                    return parse(e["params"].get("output"))
                c.events.append(e)
        raise TimeoutError(inv)

    print(f"Sightline WebMCP smoke · {URL}")
    check({"list_packs", "scan_page", "navigate_node"} <= set(tools), f"tools registered on load: {sorted(tools)}")
    check(all(tools[n].get("readOnly") for n in tools if n in ("list_packs", "scan_page", "navigate_node", "highlight_issue", "propose_fix", "re_scan")), "read tools carry readOnlyHint")
    check(tools.get("navigate_node", {}).get("untrustedContent") is True, "navigate_node carries untrustedContentHint")

    packs = call("list_packs")
    check(len(packs.get("packs", packs) if isinstance(packs, dict) else packs) == 3, "list_packs → 3 rule packs")
    scan = call("scan_page")
    check(scan["issueCount"] == 23 and scan["score"] == 54, f"scan_page → {scan['issueCount']} issues, overall {scan['score']} (expected 23 / 54)")
    first = scan["issues"][0]
    needs = call("propose_fix", {"issueId": first["id"]})
    check(needs.get("status") == "needs_input" and "html" in needs.get("context", {}), f"propose_fix without content → needs_input ({needs.get('requiredField')}) with page context")
    authored = {"role": "button"} if needs.get("requiredField") == "role" else {needs.get("requiredField"): "Sightline smoke"}
    patch = call("propose_fix", {"issueId": first["id"], **authored})
    check(patch.get("authoredBy") == "agent" and isinstance(patch.get("evidence"), list), "authored proposal carries authoredBy=agent + evidence[]")
    harvest()
    check("apply_fix" in tools and "export_patch" not in tools, "apply_fix registers after a proposal; export_patch not before an approval")

    inv = call("apply_fix", {"issueId": first["id"], "patchId": patch["id"]}, wait=False)
    c.pump(1.2)
    role_before = c.eval(f"document.querySelector('.audit-canvas {first['selector']}')?.getAttribute('role')")
    check(not c.take("WebMCP.toolResponded"), "apply_fix stays pending while the approval sheet is open")
    check(role_before != "button", f"DOM unchanged before approval (role={role_before!r})")
    check(c.eval("(()=>{const el=document.activeElement; return !!el?.closest('[role=dialog]')})()") is True, "focus is inside the approval dialog")
    c.eval("[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Approve'))?.click(); true")
    res = await_(inv, 30)
    check(res.get("status") == "applied" and res.get("score", 0) > 54, f"after Approve: applied, overall {res.get('score')}")
    harvest()
    check(tools.get("export_patch", {}).get("untrustedContent") is True and tools.get("revert_fix") is not None, "export_patch (untrustedContentHint) and revert_fix register after the first approval")
    exp = call("export_patch", {"format": "diff"})
    check(exp.get("fixCount") == 1 and "--- a/" in exp.get("content", ""), "export_patch returns only the approved change as a diff")
    check(c.eval("typeof window.__SIGHTLINE__") == "undefined", "no debug handle exposed in production")
finally:
    c.close()

print("\nRESULT:", "PASS" if not failures else f"FAIL ({len(failures)})")
sys.exit(1 if failures else 0)
