"""
破冰协议 · 思考预算计时器

用法：
  python timer.py 5        # 5 分钟倒计时
  python timer.py 30s      # 30 秒倒计时
  python timer.py          # 默认 5 分钟

时间到了会发出声音提醒。
按 Ctrl+C 可提前结束。
"""

import sys
import time

try:
    import winsound
    HAS_BEEP = True
except ImportError:
    HAS_BEEP = False


def parse_time(arg: str) -> int:
    """解析时间参数，返回秒数"""
    if arg.endswith("s"):
        return int(arg[:-1])
    return int(arg) * 60


def format_time(seconds: int) -> str:
    m, s = divmod(seconds, 60)
    return f"{m:02d}:{s:02d}"


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else "5"
    try:
        total = parse_time(raw)
    except (ValueError, IndexError):
        total = 300

    print(f"\n{'='*40}")
    print(f"  ICEBREAKER PROTOCOL - THINKING BUDGET")
    print(f"  Countdown: {format_time(total)}")
    print(f"  When time is up, you MUST act.")
    print(f"{'='*40}\n")

    remaining = total
    try:
        while remaining > 0:
            # 最后 10 秒逐秒显示，之前每 10 秒更新一次
            if remaining <= 10 or remaining % 10 == 0:
                bar_len = 30
                filled = int(bar_len * (total - remaining) / total)
                bar = "#" * filled + "-" * (bar_len - filled)
                print(f"\r  [{bar}] {format_time(remaining)}  ", end="", flush=True)

            time.sleep(1)
            remaining -= 1

        print(f"\r  [{'#'*30}] 00:00  ")

        # 时间到，发出声音
        print(f"\n  >>> TIME'S UP. START NOW. <<<\n")
        if HAS_BEEP:
            for _ in range(3):
                winsound.Beep(800, 300)
                time.sleep(0.2)
        else:
            print("\a")

    except KeyboardInterrupt:
        print(f"\n\n  Stopped early. {format_time(remaining)} remaining.")
        print(f"  Remember: stopping early is also a decision.\n")


if __name__ == "__main__":
    main()
