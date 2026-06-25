export default {
  async fetch(request) {
    // 1. Получаем параметр department из запроса (если не передан — 240)
    const url = new URL(request.url);
    const department = url.searchParams.get("department") || "240";

    // 2. Формируем целевой URL
    const targetUrl = `https://lifemart.ru/apps/coffee-logs/index.html?department=${department}`;

    // 3. Делаем запрос к оригинальному сайту
    const response = await fetch(targetUrl, {
      headers: {
        "Host": "lifemart.ru",
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0"
      }
    });

    // 4. Если ответ не HTML (картинки, CSS, JS) — возвращаем как есть
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

    // 5. Создаём HTMLRewriter и удаляем все элементы с классом debug-panel
    const rewriter = new HTMLRewriter().on("div.debug-panel", {
      element(element) {
        element.remove(); // полностью удаляем блок
      }
    });

    // 6. Возвращаем преобразованный ответ
    //    HTMLRewriter.transform() сам исправляет Content-Length и убирает Content-Encoding
    return rewriter.transform(response);
  }
};
