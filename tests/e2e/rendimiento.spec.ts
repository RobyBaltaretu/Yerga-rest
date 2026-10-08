import { expect, test } from "@playwright/test";
import { soloEn } from "./utils";

/**
 * Criterio 9: la portada carga en móvil con LCP por debajo de 2,5 s.
 * Mismas condiciones que Lighthouse en móvil: 4G lenta (150 ms de latencia, 1,6 Mbit/s)
 * y CPU 4 veces más lenta. Se toma la mediana de tres cargas sin caché.
 * La medición definitiva es la de producción (PageSpeed Insights sobre la URL real).
 */
test.describe("Rendimiento", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(soloEn(testInfo, "movil"), "Se mide en móvil");
  });

  test("LCP de la portada en móvil por debajo de 2,5 s (4G lenta, CPU ×4)", async ({ page }) => {
    test.setTimeout(120_000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    const medidas: number[] = [];
    for (let i = 0; i < 3; i++) {
      await page.goto("/es", { waitUntil: "load" });
      const lcp = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let ultimo = 0;
            new PerformanceObserver((l) => {
              for (const e of l.getEntries()) ultimo = e.startTime;
            }).observe({ type: "largest-contentful-paint", buffered: true });
            setTimeout(() => resolve(ultimo), 1500);
          }),
      );
      medidas.push(Math.round(lcp));
    }
    medidas.sort((a, b) => a - b);
    console.log(`LCP (ms): ${medidas.join(", ")} · mediana ${medidas[1]}`);
    expect(medidas[1]).toBeLessThan(2500);
  });
});
