"""把底层网络/接口异常翻译成用户能据此行动的中文短语。

前端原本直接显示 ``str(e)``，例如：

    HTTPSConnectionPool(host='apihub.agnes-ai.com', port=443): Max retries
    exceeded with url: /v1/chat/completions (Caused by SSLError(...))

用户无法据此判断该做什么。本模块把这类异常归纳成「原因 + 下一步」，
供各 pipeline 在失败时展示。
"""
from __future__ import annotations

import asyncio

try:  # requests 是运行期必备依赖，这里的兜底仅为让本模块可独立导入
    import requests
except Exception:  # pragma: no cover
    requests = None  # type: ignore


def describe_error(exc: Exception) -> str:
    """返回一句可执行的中文说明；无法归类时回退到原始信息。"""
    text = str(exc)

    if requests is not None:
        if isinstance(exc, requests.exceptions.SSLError) or "SSLError" in text or "SSL" in text:
            return (
                "无法建立 HTTPS 连接到 Agnes 服务器。"
                "可能被网络/防火墙拦截，或需在设置中切换 .com / .cn 域名。"
                "排查：python3 scripts/chan_doan_mang.py"
            )
        if isinstance(exc, requests.exceptions.ConnectTimeout):
            return "连接 Agnes 服务器超时，网络缓慢或不可达。请稍后重试或更换网络。"
        if isinstance(exc, requests.exceptions.ReadTimeout):
            return "等待 Agnes 服务器响应超时。请稍后重试。"
        if isinstance(exc, requests.exceptions.HTTPError):
            resp = getattr(exc, "response", None)
            code = getattr(resp, "status_code", None)
            if code in (401, 403):
                return "API Key 被拒绝（HTTP %s）。请检查 Key 是否正确或已失效。" % code
            if code == 429:
                return "触发限流或配额用尽（HTTP 429）。请稍后重试，或添加更多 API Key。"
            if code is not None:
                return "Agnes 服务器返回 HTTP %s。%s" % (code, text[:160])
        if isinstance(exc, requests.exceptions.ConnectionError):
            return (
                "无法连接 Agnes 服务器。请检查网络，或在设置中切换 .com / .cn 域名。"
                "排查：python3 scripts/chan_doan_mang.py"
            )

    if isinstance(exc, asyncio.TimeoutError):
        return "操作超时，网络缓慢或服务器无响应。请稍后重试。"

    # 兜底：保留原文，但截断避免前端塞满整屏堆栈
    return text[:400] if text else type(exc).__name__
