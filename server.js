const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { JSDOM } = require('jsdom');
const zlib = require('zlib');
const { promisify } = require('util');
const gunzip = promisify(zlib.gunzip);
const brotliDecompress = promisify(zlib.brotliDecompress);

const app = express();
const PORT = process.env.PORT || 3000;

const proxy = createProxyMiddleware({
  target: 'https://lifemart.ru',
  changeOrigin: true,
  selfHandleResponse: true,
  onProxyRes: async (proxyRes, req, res) => {
    const contentType = proxyRes.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      // Не HTML — проксируем как есть
      proxyRes.pipe(res);
      return;
    }

    // Собираем все куски ответа в буфер
    const chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', async () => {
      try {
        let buffer = Buffer.concat(chunks);

        // Определяем кодировку сжатия
        const encoding = proxyRes.headers['content-encoding'];

        // Если есть сжатие — разжимаем
        if (encoding === 'gzip') {
          buffer = await gunzip(buffer);
        } else if (encoding === 'br') {
          buffer = await brotliDecompress(buffer);
        } else if (encoding === 'deflate') {
          // deflate пока опустим, редко используется
        }

        // Теперь buffer содержит распакованный HTML в виде Buffer
        const html = buffer.toString('utf8');

        // Используем JSDOM для удаления панели
        const dom = new JSDOM(html);
        const debugPanel = dom.window.document.querySelector('.debug-panel');
        if (debugPanel) {
          debugPanel.remove();
          console.log('✅ debug-panel удалена');
        } else {
          console.log('⚠️ debug-panel не найдена');
        }

        // Формируем ответ
        const modifiedHtml = dom.serialize();

        // Удаляем заголовки сжатия, т.к. мы уже отдаём распакованный HTML
        delete proxyRes.headers['content-encoding'];
        delete proxyRes.headers['content-length']; // длина изменилась, пусть браузер сам определит (или вычислим новую)

        res.set(proxyRes.headers);
        res.setHeader('Content-Type', 'text/html');
        res.send(modifiedHtml);
      } catch (err) {
        console.error('Ошибка обработки HTML:', err);
        res.status(500).send('Ошибка прокси');
      }
    });
  }
});

app.use('/', proxy);

app.listen(PORT, () => {
  console.log(`🚀 Прокси запущен на порту ${PORT}`);
});
