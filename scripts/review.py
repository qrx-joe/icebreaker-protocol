"""
破冰协议 · 产出质量评价器

用法：
  uv run python scripts/review.py "任务名"     # 直接指定任务名
  uv run python scripts/review.py              # 交互式输入任务名

交互式评价 5 个维度，自动生成 Markdown 报告并保存 JSON 历史。
"""

import json
import os
import sys
from datetime import datetime

# Windows 终端编码兼容
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")

DIMENSIONS = [
    ("功能完整性", "核心流程是否走通、边界情况是否处理"),
    ("代码/产出质量", "结构是否清晰、是否有明显坏味道"),
    ("可展示性", "是否愿意主动分享给别人看"),
    ("文档/注释", "别人能否独立理解和运行"),
    ("受众匹配度", "是否精确命中目标受众预期"),
]

SCORE_LABELS = {
    1: "灾难",
    2: "较差",
    3: "勉强",
    4: "良好",
    5: "骄傲",
}


def get_score(prompt: str) -> int:
    """获取 1-5 的整数评分"""
    while True:
        val = input(f"  {prompt} (1-5): ").strip()
        if val in ("1", "2", "3", "4", "5"):
            return int(val)
        print("    ⚠ 请输入 1-5 之间的整数")


def get_text(prompt: str) -> str:
    """获取多行文本输入，空行结束"""
    print(f"  {prompt}（直接回车跳过）:")
    lines = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line == "":
            break
        lines.append(line)
    return "\n".join(lines)


def calculate_verdict(total: int) -> tuple[str, str]:
    """根据总分计算评级结论"""
    if total >= 22:
        return (
            "可投递/发布",
            "这个产出达到了对外展示的标准。你可以自信地发布、提交或分享。",
        )
    elif total >= 16:
        return (
            "能用但有限制",
            "核心可用，但投递前需要明确说明限制条件（如'这是 MVP'、'文档待完善'）。",
        )
    elif total >= 11:
        return (
            "需继续修改",
            "当前状态只能给自己看。至少还有 2-3 个明显问题需要解决后才能对外展示。",
        )
    else:
        return (
            "回炉重造",
            "产出质量严重不足。建议重新审视核心思路，而非在细节上修补。",
        )


def generate_markdown(
    task: str,
    scores: list[int],
    comments: list[str],
    overall: str,
    verdict_title: str,
    verdict_desc: str,
) -> str:
    """生成 Markdown 格式评价报告"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        f"# 产出质量评价报告：{task}",
        "",
        f"- **评价时间**：{now}",
        f"- **总分**：{sum(scores)} / 25",
        f"- **评级**：{verdict_title}",
        "",
        "## 维度评分",
        "",
    ]

    for i, (name, desc) in enumerate(DIMENSIONS):
        score = scores[i]
        label = SCORE_LABELS[score]
        lines.append(f"### {i + 1}. {name} — {score}/5 ({label})")
        lines.append(f"> {desc}")
        if comments[i]:
            lines.append(f"\n{comments[i]}")
        lines.append("")

    lines.extend([
        "## 总评",
        "",
        f"**{verdict_title}**",
        "",
        f"{verdict_desc}",
        "",
        "## 改进建议",
        "",
        overall if overall else "（未填写）",
        "",
        "---",
        "",
        "*本报告由破冰协议 · 产出质量评价器生成*",
    ])

    return "\n".join(lines)


def save_report(task: str, markdown: str) -> str:
    """保存 Markdown 报告到 reviews/ 目录"""
    reviews_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reviews"
    )
    os.makedirs(reviews_dir, exist_ok=True)
    safe_name = task.replace(" ", "_").replace("/", "_").replace("\\", "_")[:30]
    filename = f"{datetime.now().strftime('%Y-%m-%d_%H-%M')}_{safe_name}.md"
    filepath = os.path.join(reviews_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(markdown)
    return filepath


def save_history(entry: dict) -> None:
    """追加评价历史到 reviews/history.json"""
    reviews_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reviews"
    )
    os.makedirs(reviews_dir, exist_ok=True)
    history_path = os.path.join(reviews_dir, "history.json")

    history = []
    if os.path.exists(history_path):
        try:
            with open(history_path, "r", encoding="utf-8") as f:
                history = json.load(f)
        except (json.JSONDecodeError, OSError):
            history = []

    history.append(entry)

    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def main() -> None:
    """主入口"""
    task = sys.argv[1] if len(sys.argv) > 1 else input("任务名称: ").strip()
    if not task:
        task = "未命名任务"

    print(f"\n{'=' * 50}")
    print(f"  ICEBREAKER PROTOCOL - QUALITY REVIEW")
    print(f"  任务：{task}")
    print(f"{'=' * 50}")
    print("\n请对每个维度评分（1=灾难，5=骄傲）：\n")

    scores = []
    comments = []

    for name, desc in DIMENSIONS:
        print(f"> {name}")
        print(f"  ({desc})")
        score = get_score("评分")
        scores.append(score)
        comment = get_text("评语")
        comments.append(comment)
        print()

    total = sum(scores)
    verdict_title, verdict_desc = calculate_verdict(total)

    print(f"\n{'=' * 50}")
    print(f"  总分：{total} / 25")
    print(f"  评级：{verdict_title}")
    print(f"{'=' * 50}\n")

    overall = input("改进建议（一句话）: ").strip()

    markdown = generate_markdown(task, scores, comments, overall, verdict_title, verdict_desc)
    filepath = save_report(task, markdown)

    history_entry = {
        "task": task,
        "timestamp": datetime.now().isoformat(),
        "total": total,
        "max": 25,
        "verdict": verdict_title,
        "scores": {DIMENSIONS[i][0]: scores[i] for i in range(len(DIMENSIONS))},
    }
    save_history(history_entry)

    print(f"\n[OK] Markdown report saved: {filepath}")
    print(f"[OK] History updated: reviews/history.json")
    print(f"\n{verdict_desc}\n")


if __name__ == "__main__":
    main()
