import json
import os
import re
import urllib.error
import urllib.request


API_KEY = os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
BASE_URL = os.getenv(
    "DEEPSEEK_BASE_URL",
    "https://api.deepseek.com" if os.getenv("DEEPSEEK_API_KEY") else "https://api.openai.com/v1",
).rstrip("/")
MODEL = os.getenv("DEEPSEEK_MODEL") or os.getenv("OPENAI_MODEL") or ("deepseek-chat" if os.getenv("DEEPSEEK_API_KEY") else "gpt-4o-mini")


def normalize_text(value):
    return str(value or "").strip()


def json_response(handler, payload, status=200):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler):
    length = int(handler.headers.get("content-length") or 0)
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8", errors="replace")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def step(title, instruction, output, minutes=3):
    return {
        "title": title,
        "instruction": instruction,
        "output": output,
        "minutes": minutes,
    }


def chat_completions_url():
    return BASE_URL + "/chat/completions"


def call_ai(messages, max_tokens=600, temperature=0.4):
    if not API_KEY:
        return ""

    body = json.dumps(
        {
            "model": MODEL,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        chat_completions_url(),
        data=body,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=28) as response:
            payload = json.loads(response.read().decode("utf-8"))
        return normalize_text(payload["choices"][0]["message"]["content"])
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, IndexError, json.JSONDecodeError, TimeoutError):
        return ""


def safe_history(history):
    cleaned = []
    for item in (history or [])[-10:]:
        role = item.get("role")
        content = normalize_text(item.get("content"))
        if role in {"user", "assistant"} and content:
            cleaned.append({"role": role, "content": content[:1800]})
    return cleaned


def attachment_context(attachments):
    attachments = attachments or []
    if not attachments:
        return ""
    lines = ["", "[附件摘要]"]
    for item in attachments[:6]:
        name = normalize_text(item.get("name"))[:100] or "未命名附件"
        file_type = normalize_text(item.get("type") or "unknown")
        text = normalize_text(item.get("text"))
        lines.append(f"- {name} ({file_type})")
        if text:
            lines.append(text[:1000])
    return "\n".join(lines)[:4500]


def parse_json_object(text):
    text = normalize_text(text)
    if not text:
        return {}
    match = re.search(r"\{.*\}", text, flags=re.S)
    raw = match.group(0) if match else text
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def try_ai_plan(task, attachments=None, time_preference='standard', output_mode='deliverable'):
    # 根据时间偏好生成时间规则说明
    time_rules = {
        'compact': '每步 1 到 8 分钟，尽量控制在 3 分钟以内，节奏紧凑',
        'loose': '每步 3 到 20 分钟，复杂步骤可以给更多时间，节奏宽松',
    }.get(time_preference, '每步 1 到 15 分钟，根据难度合理分配')

    # 根据产出模式生成步骤规则说明
    output_rules = {
        'draft': '只需粗略框架，步骤可以宽泛，追求"有东西可改"即可',
        'portfolio': '步骤要精细，可能需要增加检查、打磨、排版等额外步骤',
    }.get(output_mode, '标准拆解，每步必须有明确可见产出')

    prompt = f"""
你是「破冰协议」的任务拆解器。用户任务：{task}

请只返回 JSON，不要 Markdown，不要解释：
{{
  "steps": [
    {{
      "title": "短标题",
      "instruction": "具体执行指令，不能是想一想，必须让用户产出东西",
      "output": "做完后可见的产出物",
      "minutes": 5
    }}
  ]
}}

规则：
- 3 到 5 步。
- {time_rules}。
- {output_rules}。
- 每步必须有可见产出。
- 第一版目标是可修改的雏形，不是完美成品。
"""
    prompt += attachment_context(attachments)
    raw = call_ai([{"role": "user", "content": prompt}], max_tokens=800, temperature=0.2)
    payload = parse_json_object(raw)
    steps = []

    # 系数映射
    multiplier = {'compact': 0.6, 'loose': 1.5}.get(time_preference, 1.0)
    min_min = 1 if time_preference == 'compact' else 3
    max_min = 8 if time_preference == 'compact' else (20 if time_preference == 'loose' else 15)

    # 产出模式影响步骤数
    step_limits = {
        'draft': (3, 3),
        'portfolio': (5, 6),
    }.get(output_mode, (4, 5))
    min_steps, max_steps = step_limits

    for item in payload.get("steps", [])[:max_steps]:
        title = normalize_text(item.get("title"))
        instruction = normalize_text(item.get("instruction"))
        output = normalize_text(item.get("output"))
        if not (title and instruction and output):
            continue
        try:
            minutes = int(item.get("minutes") or 5)
        except (TypeError, ValueError):
            minutes = 5
        # 应用时间偏好系数
        minutes = int(round(minutes * multiplier))
        steps.append(step(title, instruction, output, max(min_min, min(minutes, max_min))))
    return steps if min_steps <= len(steps) <= max_steps else []


def try_ai_reply(payload):
    steps, current, active = current_step(payload)
    task = clean_task(payload)
    outputs = payload.get("outputs") or []
    context = {
        "task": task,
        "current_step_index": current + 1,
        "current_step": active,
        "previous_outputs": [normalize_text(item)[:1200] for item in outputs if normalize_text(item)][-5:],
    }
    system_prompt = (
        "你是 [Protocol]，破冰协议的 AI 助手。用户正在一个分步工作流中完成任务。\n"
        "规则：\n"
        "- 不要安慰、不要讲道理、不要评价用户。\n"
        "- 直接产出内容：如果用户要标题就给标题，要代码就给代码，要消息就给消息。\n"
        "- 给出可以直接使用的具体内容，不要空泛建议。\n"
        "- 只服务当前步骤，不要扩大范围。\n"
        "- 中文回复，简洁，但要有实质内容。"
    )
    user_prompt = (
        "[工作流上下文]\n"
        + json.dumps(context, ensure_ascii=False)
        + attachment_context(payload.get("attachments"))
        + "\n\n[用户请求]\n"
        + normalize_text(payload.get("message"))[:2000]
    )
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(safe_history(payload.get("history")))
    messages.append({"role": "user", "content": user_prompt[:7000]})
    return call_ai(messages, max_tokens=650, temperature=0.5)


def infer_steps(task, time_preference='standard', output_mode='deliverable'):
    task = normalize_text(task) or "这个任务"
    lowered = task.lower()

    multiplier = {'compact': 0.6, 'loose': 1.5}.get(time_preference, 1.0)
    min_min = 1 if time_preference == 'compact' else 3
    max_min = 8 if time_preference == 'compact' else (20 if time_preference == 'loose' else 15)

    def adjust(minutes):
        return max(min_min, min(int(round(minutes * multiplier)), max_min))

    if any(word in lowered for word in ["博客", "文章", "小红书", "笔记", "内容"]):
        if output_mode == 'draft':
            return [
                step("确定选题", "写出主题和核心卖点。", "主题 + 3个关键词", adjust(3)),
                step("写个大概", "把要点快速写成一段可读的内容。", "初稿大意", adjust(5)),
                step("快速检查", "扫一眼错别字和不通顺的地方。", "可修改版本", adjust(3)),
            ]
        if output_mode == 'portfolio':
            return [
                step("选题研究", "确定主题、受众、核心卖点和竞品差异。", "选题报告", adjust(4)),
                step("标题与封面文案", "写 3 个标题候选和封面文案。", "3 个标题 + 封面文案", adjust(3)),
                step("搭建正文大纲", "写开头、3-5 个要点、结尾句。", "详细大纲", adjust(5)),
                step("填充正文内容", "把每个要点扩展成完整段落。", "完整正文", adjust(6)),
                step("润色与打磨", "优化措辞、调整节奏、增强吸引力。", "润色版", adjust(5)),
                step("排版检查", "检查分段、标点、错别字和格式。", "最终版本", adjust(3)),
            ]
        return [
            step("确定选题与核心卖点", "写出主题、受众和一个最想让人记住的点。", "一个主题 + 3 个关键词", adjust(3)),
            step("撰写标题与封面文案", "写 3 个标题候选和 1 句封面文案。", "3 个标题 + 1 句封面文案", adjust(3)),
            step("搭建正文框架", "写开头、3 个要点和结尾句。", "正文骨架", adjust(5)),
            step("填充正文内容", "把每个要点补成可以读的一段话。", "完整初稿", adjust(6)),
            step("检查并提交", "只检查错别字、空白段和最明显的不通顺。", "可提交版本", adjust(3)),
        ]

    if any(word in lowered for word in ["网站", "网页", "页面", "landing", "前端", "作品集"]):
        if output_mode == 'draft':
            return [
                step("明确目标", "写出页面要让人完成的一件事。", "页面目标", adjust(3)),
                step("画出大致结构", "用文字写出从上到下的大致布局。", "结构草图", adjust(5)),
                step("填充内容", "为每个区域写最小可用文案。", "有内容的页面", adjust(5)),
            ]
        if output_mode == 'portfolio':
            return [
                step("明确页面目标", "写出页面要让用户完成的一件事。", "一句页面目标", adjust(3)),
                step("列出内容块", "列出必须出现的所有内容块和优先级。", "完整内容清单", adjust(3)),
                step("首屏结构", "写出从上到下的详细布局。", "首屏布局", adjust(4)),
                step("文案初稿", "为每个内容块写可用文案。", "页面文案", adjust(5)),
                step("视觉检查", "检查间距、对齐、层次和可读性。", "视觉优化版", adjust(4)),
                step("交互动线", "确认用户从进入到完成目标的完整路径。", "最终版本", adjust(3)),
            ]
        return [
            step("明确页面目标", "写出这个页面要让用户完成的一件事。", "一句页面目标", adjust(3)),
            step("列出关键内容块", "列出首页必须出现的 3 个内容块。", "内容块清单", adjust(3)),
            step("画出首屏结构", "用文字写出从上到下的布局。", "首屏布局草稿", adjust(4)),
            step("生成第一版文案", "为每个内容块写最小可用文案。", "页面文案初稿", adjust(5)),
            step("确定下一处修改", "只挑一个最影响观感的地方作为下一轮。", "一个改进点", adjust(2)),
        ]

    if output_mode == 'draft':
        return [
            step("写下当前状态", f"围绕「{task}」写出现在有什么、卡在哪里。", "状态描述", adjust(3)),
            step("列出目标", "列出完成后必须出现的可见结果。", "目标清单", adjust(5)),
            step("拆解第一步", "把目标拆成 1 个今天能做完的动作。", "可执行动作", adjust(4)),
        ]
    if output_mode == 'portfolio':
        return [
            step("写下当前状态", f"围绕「{task}」写出现在已经有什么、卡在哪里。", "一段当前状态描述", adjust(3)),
            step("列出三个目标", "列出这件事完成后必须出现的 3 个可见结果。", "3 个结果指标", adjust(5)),
            step("选择优先目标", "从 3 个结果里选一个最小、最先做的。", "一个优先目标", adjust(3)),
            step("拆解第一步行动", "把优先目标拆成 1 个今天能做完的动作。", "一个可执行动作", adjust(4)),
            step("执行并记录", "完成第一步，记录产出和遇到的问题。", "执行记录", adjust(5)),
            step("复盘与优化", "回顾产出，找出可以改进的地方。", "优化方案", adjust(4)),
        ]
    return [
        step("写下当前状态", f"围绕「{task}」写出现在已经有什么、卡在哪里。", "一段当前状态描述", adjust(3)),
        step("列出三个目标", "列出这件事完成后必须出现的 3 个可见结果。", "3 个结果指标", adjust(5)),
        step("选择优先目标", "从 3 个结果里选一个最小、最先做的。", "一个优先目标", adjust(3)),
        step("拆解第一步行动", "把优先目标拆成 1 个今天能做完的动作。", "一个可执行动作", adjust(4)),
    ]


def extract_task(payload):
    task = normalize_text(payload.get("task"))
    if task:
        return task
    message = normalize_text(payload.get("message"))
    message = re.sub(r"^\[系统上下文\].*?\[用户问题\]", "", message, flags=re.S).strip()
    return message[:80] or "这个任务"


def is_agreement(message):
    return any(token in message for token in ["同意", "开始", "启动", "第 1 步", "第一步", "走起"])


def is_done_request(message):
    return any(token in message for token in ["所有步骤", "完成了", "拼装成型", "结束", "交付"])


def is_stuck(message):
    return any(token in message for token in ["卡", "不会", "不知道", "没思路", "写不出", "阻力"])


def current_step(payload):
    steps = payload.get("steps") or []
    current = int(payload.get("current_step") or 0)
    current = max(0, min(current, len(steps) - 1)) if steps else 0
    return steps, current, steps[current] if steps else {}


def last_visible_output(payload):
    outputs = payload.get("outputs") or []
    for item in reversed(outputs):
        text = normalize_text(item)
        if text:
            return text
    return ""


def clean_task(payload):
    task = normalize_text(payload.get("task") or extract_task(payload))
    return task[:60] or "这件事"


def draft_for_step(task, active):
    title = normalize_text(active.get("title"))
    output = normalize_text(active.get("output"))

    if any(token in title + output for token in ["目标", "结果指标"]):
        return (
            f"先用这一版，不要再空转：\n\n"
            f"1. 完成「{task}」的最小可见版本，能被别人看见或使用。\n"
            f"2. 明确 3 个判断完成的标准，避免只停留在“感觉差不多”。\n"
            f"3. 留下一个下一轮可修改的入口：问题清单、待补材料或改进点。\n\n"
            f"采纳到左侧后，最多改 1 分钟。"
        )

    if any(token in title + output for token in ["标题", "封面"]):
        return (
            f"给你 3 个可直接改的版本：\n\n"
            f"1. 我用 30 分钟把「{task}」推进了一步\n"
            f"2. 别再准备了：先做出一个能改的版本\n"
            f"3. 从空白到雏形：一次小启动记录\n\n"
            f"封面文案：先让它存在，再让它变好。"
        )

    if any(token in title + output for token in ["框架", "结构", "布局"]):
        return (
            f"可以先按这个骨架写：\n\n"
            f"开头：我一直卡在「{task}」，不是因为不会，而是启动成本太高。\n"
            f"要点 1：先把目标缩小到一个可见产出。\n"
            f"要点 2：限制时间，避免无限准备。\n"
            f"要点 3：允许粗糙，因为初稿的用途是被修改。\n"
            f"结尾：今天不追求完美，只追求留下一个能继续改的版本。"
        )

    if any(token in title + output for token in ["状态", "当前"]):
        return (
            f"当前状态：我想推进「{task}」，但还没有形成可见产出。现在已有的是一个大致方向，缺的是可以落地的第一块内容。"
            f"我先不继续扩展范围，只把它压缩成下一步能完成的动作。"
        )

    return (
        f"直接写这一版：\n\n"
        f"围绕「{task}」，我先产出一个最小版本。它不追求完整，只要能被看见、能被修改、能推动下一步。"
    )


def directions_for_step(task, active):
    title = normalize_text(active.get("title") or "当前步骤")
    output = normalize_text(active.get("output") or "可见产出")
    return (
        f"给你 3 个方向，选一个就写，别全都要：\n\n"
        f"1. 实用方向：把「{title}」写成清单，最后交付「{output}」。\n"
        f"2. 叙事方向：先写为什么要做「{task}」，再写一个最小结果。\n"
        f"3. 验收方向：直接写完成后能看见什么、谁能判断它完成、下一步改哪里。\n\n"
        f"我建议选第 3 个，因为它最不容易变成空话。"
    )


def advice_for_output(task, active, previous):
    title = normalize_text(active.get("title") or "当前步骤")
    if not previous:
        return draft_for_step(task, active)
    excerpt = previous[:120]
    return (
        f"基于你左侧已有内容，我的建议是只改一处：把它从“描述任务”改成“验收结果”。\n\n"
        f"你现在的核心内容：{excerpt}\n\n"
        f"下一版这样补：\n"
        f"1. 加一个具体对象：这次到底产出什么。\n"
        f"2. 加一个数量或边界：几个、多少字、哪一页、哪一个文件。\n"
        f"3. 加一个判断标准：别人看到什么算完成。\n\n"
        f"当前步骤「{title}」不要扩展，只补这 3 行。"
    )


def assistant_reply(payload):
    message = normalize_text(payload.get("message"))
    task = clean_task(payload)
    _, _, active = current_step(payload)
    previous = last_visible_output(payload)

    if any(token in message for token in ["起草", "帮我写", "草一下", "直接写", "生成"]):
        return draft_for_step(task, active)
    if any(token in message for token in ["方向", "思路", "参考", "选项"]):
        return directions_for_step(task, active)
    if any(token in message for token in ["结合", "建议", "优化", "上一", "产出"]):
        return advice_for_output(task, active, previous)
    if is_stuck(message):
        return (
            f"你现在不是缺信息，是缺一个可提交版本。直接填这句：\n\n"
            f"我先围绕「{task}」完成当前步骤：{normalize_text(active.get('instruction')) or '写出一个最小版本'}。\n"
            f"本轮只交付：{normalize_text(active.get('output')) or '一个可见产出'}。"
        )
    return advice_for_output(task, active, previous)


def contract_response(payload):
    task = extract_task(payload)
    return {
        "reply": "[Protocol] 先锁定约束，然后开始第 1 步。",
        "screen": "contract",
        "task": task,
        "steps": payload.get("steps") or [],
        "current_step": 0,
    }


def roadmap_response(payload):
    task = extract_task(payload)
    time_preference = normalize_text(payload.get("time_preference")) or "standard"
    if time_preference not in {"compact", "standard", "loose"}:
        time_preference = "standard"
    output_mode = normalize_text(payload.get("output_mode")) or "deliverable"
    if output_mode not in {"draft", "deliverable", "portfolio"}:
        output_mode = "deliverable"
    steps = try_ai_plan(task, payload.get("attachments"), time_preference, output_mode) or infer_steps(task, time_preference, output_mode)
    return {
        "reply": f"[Protocol] 已按你的任务拆成 {len(steps)} 个可见步骤。只启动第 1 步，其余先别管。",
        "screen": "roadmap",
        "task": task,
        "steps": steps,
        "current_step": 0,
    }


def step_help_response(payload):
    steps, current, _ = current_step(payload)
    return {
        "reply": try_ai_reply(payload) or assistant_reply(payload),
        "screen": "message",
        "task": payload.get("task") or extract_task(payload),
        "steps": steps,
        "current_step": current,
    }


def done_response(payload):
    outputs = [normalize_text(item) for item in payload.get("outputs") or [] if normalize_text(item)]
    count = len(outputs)
    reply = f"雏形已经成立：你产出了 {count} 个可见块。下一轮只改一个地方，别开新战场。" if count else "流程已经跑通。下一轮先补一个真实产出，再谈优化。"
    return {
        "reply": reply,
        "screen": "done",
        "task": payload.get("task") or extract_task(payload),
        "steps": payload.get("steps") or [],
        "current_step": len(payload.get("steps") or []),
    }


def chat_response(payload):
    message = normalize_text(payload.get("message"))
    phase = normalize_text(payload.get("phase"))

    if is_done_request(message):
        return done_response(payload)
    if phase == "step" or is_stuck(message):
        return step_help_response(payload)
    if phase == "contract" and is_agreement(message):
        return roadmap_response(payload)
    return contract_response(payload)


def summarize_text(text):
    text = normalize_text(text).replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text[:36] or "已留下一个可见产出"
