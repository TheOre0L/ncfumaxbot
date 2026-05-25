import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  Packer,
} from 'docx';
import { EmployeeFIO } from '../types/employee';

export interface MemoData {
  /** Кому (должность + ФИО) */
  recipientPosition: string;
  recipientFIO: string;
  recipientName: string;
  /** От кого */
  senderFIO: EmployeeFIO;
  senderPosition: string;
  /** Текст записки */
  body: string;
  /** Телефон исполнителя */
  phone?: string;
}

export async function generateMemo(data: MemoData): Promise<Buffer> {
  const doc = new Document({
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
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: 'Министерство науки и высшего образования Российской Федерации',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: 'Федеральное государственное автономное образовательное учреждение высшего образования',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: '«СЕВЕРО-КАВКАЗСКИЙ ФЕДЕРАЛЬНЫЙ УНИВЕРСИТЕТ» (СКФУ)',
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Невинномысский технологический институт (филиал) СКФУ',
                size: 20,
              }),
            ],
          }),

          // Служебная записка
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
            children: [
              new TextRun({
                text: 'Служебная записка',
                bold: true,
                size: 28,
              }),
            ],
          }),

          // Дата и номер
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'от______________________\t\t№______________',
                size: 24,
              }),
            ],
          }),

          // Кому
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 0 },
            children: [
              new TextRun({
                text: data.recipientPosition,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: data.recipientFIO,
                size: 24,
              }),
            ],
          }),

          // Обращение
          new Paragraph({
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: `Уважаемый ${data.recipientName}!`,
                size: 24,
              }),
            ],
          }),

          // Тело записки
          ...data.body.split('\n').map(
            (line) =>
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: line,
                    size: 24,
                  }),
                ],
              })
          ),

          // Пустые строки перед подписью
          new Paragraph({ spacing: { before: 400 }, children: [] }),
          new Paragraph({ children: [] }),

          // Подпись
          new Paragraph({
            spacing: { after: 0 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
              },
            ],
            children: [
              new TextRun({
                text: data.senderPosition,
                size: 24,
              }),
              new TextRun({
                text: '\t',
              }),
              new TextRun({
                text: data.senderFIO.short,
                size: 24,
              }),
            ],
          }),

          // Исполнитель
          ...(data.phone
            ? [
                new Paragraph({ children: [] }),
                new Paragraph({ children: [] }),
                new Paragraph({ children: [] }),
                new Paragraph({
                  spacing: { before: 600 },
                  children: [
                    new TextRun({
                      text: `Исп. ${data.senderFIO.short}`,
                      size: 20,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({
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

  return Buffer.from(await Packer.toBuffer(doc));
}
