import nodeHtmlToImage from 'node-html-to-image';
import { MemoData } from './memoGenerator';

// Загружаем логотип как base64 если файл существует
let logoBase64 = "https://nti.ncfu.ru/upload/medialibrary/9f1/eletqhoaeclc0i78t5tivpzqp6d5p53k/2f22b322_e69c_4dd2_827b_3ce4cb309137.png";

export async function generateMemoImage(data: MemoData): Promise<Buffer> {
  const bodyHtml = data.body
    .split('\n')
    .map((line) => {
      if (line.trim() === '') return '';
      return `<p>${line}</p>`;
    })
    .join('');

  const logoImg = logoBase64
    ? `<img class="header-logo" src="https://nti.ncfu.ru/upload/medialibrary/9f1/eletqhoaeclc0i78t5tivpzqp6d5p53k/2f22b322_e69c_4dd2_827b_3ce4cb309137.png" alt="Логотип СКФУ" />`
    : '';

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: "Times New Roman", Times, serif;
      color: #000;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm 20mm 15mm 25mm;
      background: #fff;
      font-size: 14pt;
      line-height: 1.2;
    }
    .header {
      text-align: center;
      line-height: 1.15;
    }
    .header-logo {
      display: block;
      width: 65mm;
      height: auto;
      margin: 0 auto 8px auto;
      opacity: 0.85;
    }
    .header p,
    .recipient p,
    .content p,
    .signature p,
    .executor p {
      margin: 0;
    }
    .small-gap { height: 12px; }
    .document-title {
      margin-top: 18px;
      text-align: center;
      font-size: 14pt;
    }
    .document-meta {
      margin-top: 1px;
      text-align: center;
      font-size: 14pt;
      white-space: pre;
    }
    .recipient {
      width: 72mm;
      margin-left: auto;
      margin-top: 26px;
      font-size: 14pt;
      line-height: 1.2;
    }
    .appeal {
      margin-top: 34px;
      text-align: center;
      font-size: 14pt;
    }
    .content {
      margin-top: 24px;
      min-height: 90mm;
      text-align: justify;
      text-indent: 12.5mm;
      font-size: 14pt;
      line-height: 1.35;
    }
    .content p {
      margin: 0 0 4px 0;
      text-indent: 12.5mm;
    }
    .signature {
      margin-top: 20px;
      font-size: 14pt;
    }
    .signature-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
    }
    .signature-position { width: 70mm; }
    .signature-space {
      flex: 1;
      min-height: 22px;
    }
    .signature-name {
      width: 42mm;
      text-align: right;
      white-space: nowrap;
    }
    .executor {
      margin-top: 55mm;
      font-size: 10pt;
      line-height: 1.15;
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      ${logoImg}
      <p>Министерство науки и высшего образования Российской Федерации</p>
      <p>Федеральное государственное автономное образовательное учреждение высшего образования</p>
      <p>«СЕВЕРО-КАВКАЗСКИЙ ФЕДЕРАЛЬНЫЙ УНИВЕРСИТЕТ» (СКФУ)</p>
      <div class="small-gap"></div>
      <p>Невинномысский технологический институт (филиал) СКФУ</p>
    </section>

    <section class="document-title">
      <p>Служебная записка</p>
    </section>
    <section class="document-meta">
      <p>от ______________________     № ______________</p>
    </section>

    <section class="recipient">
      <p>${data.recipientPosition}</p>
      <p>${data.recipientFIO}</p>
    </section>

    <section class="appeal">
      <p>Уважаемый ${data.recipientName}!</p>
    </section>

    <section class="content">
      ${bodyHtml}
    </section>

    <section class="signature">
      <div class="signature-row">
        <div class="signature-position">
          <p>${data.senderPosition}</p>
          <p>НТИ (филиал) СКФУ</p>
        </div>
        <div class="signature-space"></div>
        <div class="signature-name">${data.senderFIO.short}</div>
      </div>
    </section>

    <section class="executor">
      <p>Исп. ${data.senderFIO.short}</p>
      ${data.phone ? `<p>${data.phone}</p>` : ''}
    </section>
  </main>
</body>
</html>`;

  const image = await nodeHtmlToImage({
    html,
    type: 'png',
    quality: 100,
    transparent: false,
    puppeteerArgs: {
      defaultViewport: {
        width: 794,
        height: 1123,
      },
    },
  });

  return image as Buffer;
}
