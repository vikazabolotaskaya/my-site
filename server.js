const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { JSDOM } = require('jsdom'); // Нам понадобится jsdom для парсинга HTML

const app = express();
const PORT = process.env.PORT || 3000; // Railway сам задаёт порт через переменную окружения[reference:3]

// 1. Создаём прокси-мидлвар для всех запросов
const proxy = createProxyMiddleware({
  target: 'https://lifemart.ru',
  changeOrigin: true, // Важно: подменяем Origin на целевой домен
  selfHandleResponse: true, // Берём управление ответом на себя, чтобы изменить его
  onProxyRes: async (proxyRes, req, res) => {
    // Проверяем, что ответ — это HTML
    const contentType = proxyRes.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      // Если не HTML (картинка, CSS, JS), просто проксируем как есть
      proxyRes.pipe(res);
      return;
    }

    // Собираем тело ответа (HTML-код) в строку
    let body = '';
    proxyRes.on('data', chunk => { body += chunk; });
    proxyRes.on('end', () => {
      // 2. Используем JSDOM для парсинга HTML и удаления панели
      const dom = new JSDOM(body);
      const debugPanel = dom.window.document.querySelector('.debug-panel');
      if (debugPanel) {
        debugPanel.remove(); // Удаляем элемент
        console.log('✅ Панель debug-panel удалена!');
      } else {
        console.log('⚠️ Панель debug-panel не найдена.');
      }

      // 3. Отдаём изменённый HTML клиенту
      res.setHeader('Content-Type', 'text/html');
      res.send(dom.serialize());
    });
  }
});

// Применяем прокси ко всем запросам
app.use('/', proxy);

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`🚀 Прокси-сервер запущен на порту ${PORT}`);
});
