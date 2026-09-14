import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        async def handle_response(response):
            if "/api/" in response.url:
                try:
                    data = await response.json()
                    print(f"\nURL: {response.url}")
                    print(f"Status: {response.status}")
                    print("Body:")
                    print(json.dumps(data, indent=2))
                except Exception:
                    pass

        page.on("response", handle_response)

        url = "https://dapo.kemendikdasmen.go.id/progres/050000/050701?jenjang=SD,SMA,SMP"
        print(f"Navigating to {url}...")
        
        await page.goto(url, wait_until="networkidle")
        
        # Wait for potential lazy loading or extra XHR
        await asyncio.sleep(5)
        
        # Look for school list button/tab if data school not found
        # In Dapo, usually 'rekapitulasi' or 'sekolah' tab
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
