import re
import sys
from playwright.sync_api import sync_playwright, expect

BASE_URL = "http://127.0.0.1:4173/?demo=1"


def open_app(browser, width=390, height=844):
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "console",
        lambda message: errors.append(message.text)
        if message.type == "error" and "favicon" not in message.text
        else None,
    )
    page.goto(BASE_URL)
    page.wait_for_timeout(700)
    return context, page, errors


def assert_clean(errors):
    assert not errors, f"browser errors: {errors}"


def test_today_and_trim(browser):
    context, page, errors = open_app(browser)
    try:
        expect(page.get_by_text("超出 1.4h")).to_be_visible()
        expect(page.get_by_text("已排 7.4h", exact=False)).to_be_visible()
        page.get_by_role("button", name=re.compile("移出")).click()
        page.wait_for_timeout(400)
        expect(page.get_by_text("在容量内")).to_be_visible()
        expect(page.get_by_text("已排 5.8h", exact=False)).to_be_visible()
        expect(page.get_by_role("button", name="无需移出")).to_be_disabled()
        expect(page.get_by_text("品牌插画 · 主视觉草稿", exact=True).first).to_be_visible()
        assert_clean(errors)
    finally:
        context.close()


def test_collect_crud(browser):
    context, page, errors = open_app(browser)
    try:
        page.get_by_role("button", name="收集").click()
        page.locator('button[aria-label="记一件事"]').click()
        expect(page.get_by_role("dialog")).to_be_visible()
        page.locator("#collect-task-title").fill("写测试报告")
        page.locator("#collect-task-estimate").fill("45")
        page.locator("#collect-task-category").select_option("admin")
        page.locator("#collect-task-energy").select_option("low")
        page.get_by_role("button", name="保存").click()
        page.wait_for_timeout(300)
        expect(page.get_by_text("写测试报告", exact=True)).to_be_visible()
        expect(page.locator(".collect-count")).to_contain_text("7 件未完成")
        page.locator('button[aria-label="编辑「写测试报告」"]').click()
        page.locator("#collect-task-title").fill("写验收报告")
        page.get_by_role("button", name="保存").click()
        page.wait_for_timeout(300)
        expect(page.get_by_text("写验收报告", exact=True)).to_be_visible()
        page.locator('button[aria-label="完成「写验收报告」"]').click()
        page.wait_for_timeout(250)
        expect(page.locator(".collect-count")).to_contain_text("6 件未完成")
        page.get_by_role("button", name="行政").click()
        expect(page.get_by_text("写验收报告", exact=True)).to_be_visible()
        page.locator('button[aria-label="编辑「写验收报告」"]').click()
        page.get_by_role("button", name="删除").click()
        page.get_by_role("button", name="确认删除").click()
        page.wait_for_timeout(300)
        expect(page.get_by_text("写验收报告", exact=True)).to_have_count(0)
        assert_clean(errors)
    finally:
        context.close()


def test_plan_flow(browser):
    context, page, errors = open_app(browser)
    try:
        page.get_by_role("button", name="重新规划").click()
        expect(page.get_by_text("客户 A 提案修改", exact=True)).to_be_visible()
        page.locator("#plan-dump-input").fill("做一个新方案")
        page.locator('button[aria-label="添加这件事"]').click()
        page.wait_for_timeout(250)
        expect(page.get_by_text("做一个新方案", exact=True)).to_be_visible()
        page.get_by_role("button", name=re.compile("下一步 · 挑出三件事")).click()
        page.wait_for_timeout(250)
        expect(page.locator(".plan-pick--on")).to_have_count(3)
        page.locator(".plan-pick").nth(3).click()
        page.wait_for_timeout(200)
        expect(page.locator(".toast")).to_contain_text("今天只留三件")
        expect(page.locator(".plan-pick--on")).to_have_count(3)
        page.get_by_role("button", name=re.compile("下一步 · 排进时间")).click()
        page.wait_for_timeout(600)
        expect(page.get_by_text("完成今日规划")).to_be_visible()
        expect(page.get_by_text("留白", exact=False).first).to_be_visible()
        page.get_by_role("button", name="重新排一版").click()
        page.wait_for_timeout(250)
        page.get_by_role("button", name="完成今日规划").click()
        page.wait_for_timeout(600)
        expect(page.get_by_text("今日计划已生成")).to_be_visible()
        expect(page.get_by_text("在容量内")).to_be_visible()
        assert_clean(errors)
    finally:
        context.close()


def test_focus_and_review(browser):
    context, page, errors = open_app(browser)
    try:
        page.get_by_role("button", name="开始专注", exact=True).click()
        page.wait_for_timeout(1800)
        first_time = page.locator(".focus-ring-time").inner_text()
        page.get_by_role("button", name=re.compile("暂停")).click()
        page.wait_for_timeout(1200)
        paused_time = page.locator(".focus-ring-time").inner_text()
        assert first_time == paused_time, "timer must not move while paused"
        page.get_by_role("button", name=re.compile("继续")).click()
        page.wait_for_timeout(1200)
        assert page.locator(".focus-ring-time").inner_text() < paused_time
        page.locator("#focus-distraction-input").fill("回个客户消息")
        page.get_by_role("button", name="记下").click()
        page.wait_for_timeout(200)
        expect(page.locator(".focus-catch-item-text")).to_have_text("回个客户消息")
        page.get_by_role("button", name=re.compile("部分完成")).click()
        page.get_by_role("button", name="30 分钟", exact=True).click()
        page.get_by_role("button", name=re.compile("记录 30 分钟并结束")).click()
        page.wait_for_timeout(600)
        expect(page.get_by_text("已记录部分完成 · 30 分钟")).to_be_visible()
        page.get_by_role("button", name="复盘").click()
        page.wait_for_timeout(300)
        expect(page.get_by_text("当前兑现进度")).to_be_visible()
        page.get_by_role("button", name="客户临时改需求").click()
        page.get_by_role("button", name="接受这个建议").click()
        page.locator("#review-note").fill("今天把最难的一块先做完了。")
        page.get_by_role("button", name=re.compile("记下当前进度|收下今天")).click()
        page.wait_for_timeout(600)
        expect(page.get_by_text("连续记录 13 天")).to_be_visible()
        expect(page.get_by_text("今天已记下 52m")).to_be_visible()
        page.get_by_role("button", name="复盘", exact=True).click()
        page.wait_for_timeout(300)
        expect(page.get_by_text("已复盘")).to_be_visible()
        expect(page.locator("#review-note")).to_have_value("今天把最难的一块先做完了。")
        assert_clean(errors)
    finally:
        context.close()


def test_settings_and_persistence(browser):
    context, page, errors = open_app(browser)
    try:
        page.locator("button[aria-label*='设置']").first.click()
        page.locator("#settings-capacity").fill("300")
        page.get_by_role("button", name="保存设置").click()
        page.wait_for_timeout(400)
        expect(page.get_by_text("5h 可用")).to_be_visible()
        expect(page.get_by_text("超出 2.4h")).to_be_visible()
        page.locator("button[aria-label*='设置']").first.click()
        page.locator(".sheet__body").evaluate("element => element.scrollTop = element.scrollHeight")
        page.get_by_role("button", name="重置", exact=True).click()
        page.get_by_role("button", name="确认重置").click()
        page.wait_for_timeout(500)
        expect(page.get_by_text("6h 可用")).to_be_visible()
        page.get_by_role("button", name="收集").click()
        page.locator('button[aria-label="记一件事"]').click()
        page.locator("#collect-task-title").fill("持久化测试任务")
        page.get_by_role("button", name="保存").click()
        page.wait_for_timeout(250)
        page.reload()
        page.wait_for_timeout(700)
        page.get_by_role("button", name="收集").click()
        expect(page.get_by_text("持久化测试任务", exact=True)).to_be_visible()
        assert_clean(errors)
    finally:
        context.close()


def test_focus_persistence(browser):
    context, page, errors = open_app(browser)
    try:
        page.get_by_role("button", name="开始专注", exact=True).click()
        page.wait_for_timeout(1200)
        page.locator('button[aria-label="退出专注，回到今日"]').click()
        page.wait_for_timeout(300)
        expect(page.get_by_text("专注中 · 继续")).to_be_visible()
        page.reload()
        page.wait_for_timeout(700)
        expect(page.get_by_text("专注中 · 继续")).to_be_visible()
        page.get_by_role("button", name="专注中 · 继续").click()
        page.wait_for_timeout(500)
        expect(page.locator(".focus-ring-time")).to_be_visible()
        assert_clean(errors)
    finally:
        context.close()


def test_responsive(browser):
    for width in (390, 320, 1440):
        context, page, errors = open_app(browser, width=width, height=900)
        try:
            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            assert not overflow, f"horizontal overflow at {width}px"
            assert_clean(errors)
        finally:
            context.close()


def main():
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome", headless=True)
        tests = [
            test_today_and_trim,
            test_collect_crud,
            test_plan_flow,
            test_focus_and_review,
            test_settings_and_persistence,
            test_focus_persistence,
            test_responsive,
        ]
        for test in tests:
            try:
                test(browser)
                print(f"PASS {test.__name__}")
            except Exception as error:
                failures.append(test.__name__)
                print(f"FAIL {test.__name__}: {error}")
        browser.close()
    if failures:
        print("failed:", ", ".join(failures))
        sys.exit(1)
    print("all checks passed")


if __name__ == "__main__":
    main()
