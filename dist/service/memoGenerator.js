"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMemo = generateMemo;
const docx_1 = require("docx");
async function generateMemo(data) {
    const doc = new docx_1.Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1134, // ~2cm
                            bottom: 1134,
                            left: 1701, // ~3cm
                            right: 850, // ~1.5cm
                        },
                    },
                },
                children: [
                    // Шапка
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.CENTER,
                        spacing: { after: 0 },
                        children: [
                            new docx_1.TextRun({
                                text: 'Министерство науки и высшего образования Российской Федерации',
                                size: 20,
                            }),
                        ],
                    }),
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.CENTER,
                        spacing: { after: 0 },
                        children: [
                            new docx_1.TextRun({
                                text: 'Федеральное государственное автономное образовательное учреждение высшего образования',
                                size: 20,
                            }),
                        ],
                    }),
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.CENTER,
                        spacing: { after: 0 },
                        children: [
                            new docx_1.TextRun({
                                text: '«СЕВЕРО-КАВКАЗСКИЙ ФЕДЕРАЛЬНЫЙ УНИВЕРСИТЕТ» (СКФУ)',
                                size: 20,
                            }),
                        ],
                    }),
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [],
                    }),
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.CENTER,
                        spacing: { after: 400 },
                        children: [
                            new docx_1.TextRun({
                                text: 'Невинномысский технологический институт (филиал) СКФУ',
                                size: 20,
                            }),
                        ],
                    }),
                    // Служебная записка
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.CENTER,
                        spacing: { before: 400, after: 200 },
                        children: [
                            new docx_1.TextRun({
                                text: 'Служебная записка',
                                bold: true,
                                size: 28,
                            }),
                        ],
                    }),
                    // Дата и номер
                    new docx_1.Paragraph({
                        spacing: { after: 200 },
                        children: [
                            new docx_1.TextRun({
                                text: 'от______________________\t\t№______________',
                                size: 24,
                            }),
                        ],
                    }),
                    // Кому
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.LEFT,
                        spacing: { after: 0 },
                        children: [
                            new docx_1.TextRun({
                                text: data.recipientPosition,
                                size: 24,
                            }),
                        ],
                    }),
                    new docx_1.Paragraph({
                        alignment: docx_1.AlignmentType.LEFT,
                        spacing: { after: 200 },
                        children: [
                            new docx_1.TextRun({
                                text: data.recipientFIO,
                                size: 24,
                            }),
                        ],
                    }),
                    // Обращение
                    new docx_1.Paragraph({
                        spacing: { before: 200, after: 200 },
                        children: [
                            new docx_1.TextRun({
                                text: `Уважаемый ${data.recipientName}!`,
                                size: 24,
                            }),
                        ],
                    }),
                    // Тело записки
                    ...data.body.split('\n').map((line) => new docx_1.Paragraph({
                        spacing: { after: 100 },
                        children: [
                            new docx_1.TextRun({
                                text: line,
                                size: 24,
                            }),
                        ],
                    })),
                    // Пустые строки перед подписью
                    new docx_1.Paragraph({ spacing: { before: 400 }, children: [] }),
                    new docx_1.Paragraph({ children: [] }),
                    // Подпись
                    new docx_1.Paragraph({
                        spacing: { after: 0 },
                        tabStops: [
                            {
                                type: docx_1.TabStopType.RIGHT,
                                position: docx_1.TabStopPosition.MAX,
                            },
                        ],
                        children: [
                            new docx_1.TextRun({
                                text: data.senderPosition,
                                size: 24,
                            }),
                            new docx_1.TextRun({
                                text: '\t',
                            }),
                            new docx_1.TextRun({
                                text: data.senderFIO.short,
                                size: 24,
                            }),
                        ],
                    }),
                    // Исполнитель
                    ...(data.phone
                        ? [
                            new docx_1.Paragraph({ children: [] }),
                            new docx_1.Paragraph({ children: [] }),
                            new docx_1.Paragraph({ children: [] }),
                            new docx_1.Paragraph({
                                spacing: { before: 600 },
                                children: [
                                    new docx_1.TextRun({
                                        text: `Исп. ${data.senderFIO.short}`,
                                        size: 20,
                                    }),
                                ],
                            }),
                            new docx_1.Paragraph({
                                children: [
                                    new docx_1.TextRun({
                                        text: data.phone,
                                        size: 20,
                                    }),
                                ],
                            }),
                        ]
                        : []),
                ],
            },
        ],
    });
    return Buffer.from(await docx_1.Packer.toBuffer(doc));
}
//# sourceMappingURL=memoGenerator.js.map