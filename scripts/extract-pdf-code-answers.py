#!/usr/bin/env python3
"""
从 Python代码题题库.pdf 提取黄色高亮标准答案，与 ipynb 空位顺序对齐。

策略：
1. 按题号切分 PDF 行流
2. 每行合并相邻高亮 span 为答案片段
3. 模板行与 PDF 行对齐：整行正则抽取 > 同行高亮数匹配 > 仅高亮 orphan 行 > 顺序消费
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

try:
    import fitz
except ImportError:
    print("pymupdf required: pip3 install --user pymupdf", file=sys.stderr)
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "PythonCode" / "Python代码题题库.pdf"

QUESTION_IDS = [
    "1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5",
    "2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5",
    "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5",
    "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5",
]

BLANK_RE = re.compile(r"_{5,}")

# PDF 中填空答案高亮（排除纯语法色 6710886 单字符噪声时仍保留有意义片段）
ANSWER_COLORS = {
    3158016,
    3158064,
    12198144,
    12198177,
    6710886,
    65792,
    3158041,
    3155712,
    3092250,
    3158029,
    11935762,
}


def merge_highlight_groups(spans: list[dict]) -> list[str]:
    groups: list[str] = []
    buf = ""
    in_h = False
    for s in spans:
        t = s["text"]
        h = s.get("color") in ANSWER_COLORS
        if h:
            buf += t
            in_h = True
        else:
            if in_h and buf.strip():
                groups.append(buf.strip())
            buf = ""
            in_h = False
    if in_h and buf.strip():
        groups.append(buf.strip())
    out: list[str] = []
    for g in groups:
        g2 = g.strip()
        if not g2 or g2 == "+":
            continue
        if len(g2) == 1 and g2 in "=.,/<>+-[]()":
            continue
        out.append(g2)
    return out


def is_code_line(ln: str) -> bool:
    ln = ln.strip()
    if not ln or ln == "+":
        return False
    if ln.startswith("In [") or ln.startswith("-- "):
        return False
    if re.search(r"\.(jpg|png|ipynb|html|docx)\b", ln, re.I):
        return False
    if re.match(r"^\d+$", ln):
        return False
    if ln in (".ipynb", "csv", "jpg"):
        return False
    return bool(re.search(r"[a-zA-Z_]", ln))


def fixed_parts(template: str) -> list[str]:
    return [p for p in BLANK_RE.split(template) if p.strip()]


def line_matches_template(full: str, template: str) -> bool:
    fps = fixed_parts(template)
    if not fps:
        return False
    pos = 0
    for fp in fps:
        i = full.find(fp, pos)
        if i < 0:
            return False
        pos = i + len(fp)
    return True


def extract_from_pair(template: str, solution: str) -> list[str] | None:
    t = re.sub(r"\s*#.*$", "", template).strip()
    sol = re.sub(r"\s*#.*$", "", solution).strip()
    parts = BLANK_RE.split(t)
    if len(parts) < 2:
        return None
    body = ""
    for i, p in enumerate(parts):
        body += re.escape(p)
        if i < len(parts) - 1:
            body += r"(.*?)"
    m = re.match("^" + body + "$", sol)
    if not m:
        return None
    return [g.strip() for g in m.groups()]


def is_question_marker(full: str, qid: str) -> bool:
    """仅把题号标题行当作切分点，避免误匹配输出里的文件名等。"""
    s = full.strip()
    if s in (qid, f"{qid}.ipynb", f"{qid}.html", f"{qid}.docx"):
        return True
    if re.match(rf"^{re.escape(qid)}(?:\.ipynb|\.html|\.docx|-\d+\.jpg)?$", s):
        return True
    return False


def iter_pdf_lines_by_question() -> dict[str, list[tuple[str, list[str]]]]:
    doc = fitz.open(str(PDF_PATH))
    lines_by: dict[str, list[tuple[str, list[str]]]] = defaultdict(list)
    current: str | None = None

    for page in doc:
        d = page.get_text("dict")
        for block in d.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line["spans"]
                full = "".join(s["text"] for s in spans).rstrip()
                for qid in QUESTION_IDS:
                    if is_question_marker(full, qid):
                        current = qid
                if not current:
                    continue
                groups = merge_highlight_groups(spans)
                if groups or is_code_line(full):
                    lines_by[current].append((full, groups))
    doc.close()
    return lines_by


def blank_templates(ipynb_path: Path) -> list[str]:
    nb = json.loads(ipynb_path.read_text(encoding="utf-8"))
    out: list[str] = []
    for cell in nb["cells"]:
        if cell.get("cell_type") != "code":
            continue
        for ln in "".join(cell.get("source", [])).splitlines():
            if BLANK_RE.search(ln):
                out.append(ln.rstrip())
    return out


def answers_for_question(
    qid: str, templates: list[str], pool: list[tuple[str, list[str]]]
) -> list[str]:
    answers: list[str] = []
    cursor = 0

    for tmpl in templates:
        n = len(BLANK_RE.findall(tmpl))
        got: list[str] | None = None

        for j in range(cursor, len(pool)):
            full, groups = pool[j]
            ex = extract_from_pair(tmpl, full)
            if ex and len(ex) == n:
                got = ex
                cursor = j + 1
                break

        if not got:
            for j in range(cursor, len(pool)):
                full, groups = pool[j]
                if line_matches_template(full, tmpl) and len(groups) == n:
                    got = groups
                    cursor = j + 1
                    break

        if not got:
            for j in range(cursor, len(pool)):
                full, groups = pool[j]
                if len(groups) == n and not fixed_parts(tmpl):
                    got = groups
                    cursor = j + 1
                    break
                if len(groups) == n:
                    fps = fixed_parts(tmpl)
                    if fps and all(fp in full for fp in fps):
                        got = groups
                        cursor = j + 1
                        break

        if not got:
            for j in range(cursor, min(cursor + 8, len(pool))):
                full, groups = pool[j]
                ex = extract_from_pair(tmpl, full)
                if ex and len(ex) == n:
                    got = ex
                    cursor = j + 1
                    break
                if groups:
                    collected: list[str] = []
                    for k in range(j, min(j + 6, len(pool))):
                        _, g2 = pool[k]
                        if g2:
                            collected.extend(g2)
                        ex2 = extract_from_pair(tmpl, pool[k][0])
                        if ex2 and len(ex2) == n:
                            got = ex2
                            cursor = k + 1
                            break
                    if got:
                        break
                    if len(collected) >= n:
                        got = collected[:n]
                        cursor = j + 1
                        break

        answers.extend(got if got else [""] * n)

    return answers


def build_all() -> dict[str, list[str]]:
    lines_by = iter_pdf_lines_by_question()
    out: dict[str, list[str]] = {}
    for qid in QUESTION_IDS:
        ipynb = ROOT / "PythonCode" / f"{qid}-素材" / f"{qid}.ipynb"
        if not ipynb.is_file():
            raise FileNotFoundError(ipynb)
        templates = blank_templates(ipynb)
        pool = lines_by.get(qid, [])
        out[qid] = answers_for_question(qid, templates, pool)
    return out


def main() -> int:
    if not PDF_PATH.is_file():
        print(f"PDF not found: {PDF_PATH}", file=sys.stderr)
        return 1

    out = build_all()
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
