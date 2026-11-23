import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORBIDDEN_TAGS = {
    "div",
    "span",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "section",
    "header",
    "footer",
    "main",
    "article",
    "nav",
    "svg",
    "path",
    "ul",
    "li",
    "img",
    "a",
}
HANDLER_RE = re.compile(r"(?:bind|catch|capture-bind|capture-catch)([a-z]+)=\"([A-Za-z0-9_]+)\"")


def load_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def check_js(path, issues):
    result = subprocess.run(
        ["node", "--check", str(path)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        issues.append(f"{path}: JS syntax error: {result.stderr.strip()}")
    if path.parts[-2] in {"tests", "tools"}:
        return
    text = path.read_text(encoding="utf-8")
    for pattern, label in [
        (r"(?<![A-Za-z0-9_])window(?![A-Za-z0-9_])", "window"),
        (r"(?<![A-Za-z0-9_])localStorage(?![A-Za-z0-9_])", "localStorage"),
        (r"(?<![A-Za-z0-9_])document(?![A-Za-z0-9_])", "document"),
        (r"^\s*import\s", "ES import"),
        (r"^\s*export\s", "ES export"),
    ]:
        if re.search(pattern, text, re.M):
            issues.append(f"{path}: forbidden platform token {label}")


def check_wxml(path, page_js, issues):
    text = path.read_text(encoding="utf-8")
    clean = re.sub(r"<!--[\s\S]*?-->", "", text)
    if clean.count("{{") != clean.count("}}"):
        issues.append(f"{path}: unbalanced moustache expressions")
    stack = []
    tag_re = re.compile(
        r"<\s*(/?)\s*([A-Za-z][A-Za-z0-9-]*)((?:[^>\"']|\"[^\"]*\"|'[^']*')*?)(/?)\s*>"
    )
    for match in tag_re.finditer(clean):
        closing = match.group(1) == "/"
        tag = match.group(2)
        self_closing = match.group(4) == "/"
        if tag.lower() in FORBIDDEN_TAGS:
            issues.append(f"{path}: forbidden HTML tag <{tag}>")
        if closing:
            if not stack:
                issues.append(f"{path}: unexpected closing </{tag}>")
            elif stack[-1] != tag:
                issues.append(f"{path}: closing </{tag}> but open <{stack[-1]}>")
            else:
                stack.pop()
        elif not self_closing:
            stack.append(tag)
    if stack:
        issues.append(f"{path}: unclosed tags {stack}")
    if page_js and page_js.exists():
        js = page_js.read_text(encoding="utf-8")
        for event, handler in HANDLER_RE.findall(clean):
            if handler not in js:
                issues.append(f"{path}: handler {handler} ({event}) missing in {page_js.name}")


def check_wxss(path, issues):
    text = path.read_text(encoding="utf-8")
    if text.count("{") != text.count("}"):
        issues.append(f"{path}: unbalanced braces")
    checks = [
        (r"display\s*:\s*grid", "display:grid"),
        (r"(?<![A-Za-z-])gap\s*:", "flex gap"),
        (r"backdrop-filter", "backdrop-filter"),
        (r"conic-gradient", "conic-gradient"),
        (r"position\s*:\s*sticky", "position:sticky"),
        (r":hover", ":hover"),
    ]
    for pattern, label in checks:
        if re.search(pattern, text):
            issues.append(f"{path}: unsupported or risky WXSS feature {label}")
    for match in re.finditer(r"::(before|after)", text):
        prefix = text[max(0, match.start() - 12) : match.start()]
        if not prefix.strip().endswith("button"):
            issues.append(f"{path}: pseudo-element ::{match.group(1)} is not allowed")
    if "./" in text and "@import" in text:
        issues.append(f"{path}: relative @import is not used in this project")


def main():
    issues = []
    app = load_json(ROOT / "app.json")
    project = load_json(ROOT / "project.config.json")
    for page in app["pages"]:
        for extension in ("js", "json", "wxml", "wxss"):
            path = ROOT / f"{page}.{extension}"
            if not path.exists():
                issues.append(f"missing page file: {path}")
            elif extension == "js":
                check_js(path, issues)
            elif extension == "json":
                try:
                    load_json(path)
                except Exception as error:
                    issues.append(f"{path}: invalid JSON: {error}")
            elif extension == "wxml":
                check_wxml(path, ROOT / f"{page}.js", issues)
            elif extension == "wxss":
                check_wxss(path, issues)
    for item in app["tabBar"]["list"]:
        for key in ("iconPath", "selectedIconPath"):
            icon = ROOT / item[key]
            if not icon.exists():
                issues.append(f"missing tab icon: {icon}")
    for path in (ROOT / "utils").glob("*.js"):
        check_js(path, issues)
    check_js(ROOT / "app.js", issues)
    for key in ("appid", "compileType", "miniprogramRoot", "packOptions"):
        if key not in project:
            issues.append(f"project.config.json missing {key}")
    if project.get("appid") != "touristappid":
        issues.append("project.config.json should keep touristappid until an AppID is provided")
    if issues:
        print("\n".join(f"- {issue}" for issue in issues))
        print(f"FAILED with {len(issues)} issue(s)")
        return 1
    print(f"OK: {len(app['pages'])} pages, icons present, JS/JSON/WXML/WXSS checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
