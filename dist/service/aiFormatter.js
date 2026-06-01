"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNewsWithAI = formatNewsWithAI;
exports.generateMemoText = generateMemoText;
const openai_1 = __importDefault(require("openai"));
let client = null;
function getClient() {
    if (!client) {
        client = new openai_1.default({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY,
        });
    }
    return client;
}
const NEWS_SYSTEM_PROMPT = `Ты — редактор новостного канала. Твоя задача — отформатировать текст новости для публикации в мессенджере.

Правила:
- Раздели текст на логичные абзацы (между абзацами одна пустая строка)
- Добавь подходящие эмодзи в начало абзацев или ключевых фраз (не переборщи, 3-5 на всю новость)
- Если есть список — оформи его с эмодзи-маркерами
- Сохрани весь смысл и факты оригинала, ничего не выдумывай
- Не добавляй заголовок — он будет добавлен отдельно
- Не добавляй ссылки — они будут добавлены отдельно
- Используй markdown-форматирование: **жирный** для важных фраз
- Ответ — только отформатированный текст, без пояснений`;
const MEMO_SYSTEM_PROMPT = `Ты — помощник по составлению служебных записок в Невинномысском технологическом институте (филиал) СКФУ.

Пользователь кратко описывает суть просьбы. Ты должен написать текст основной части служебной записки в официально-деловом стиле.

Правила:
- Начинай с "Прошу Вас..." или подобной формулировки
- Пиши кратко, по делу, в официально-деловом стиле
- Если есть список — оформи нумерованным списком
- Не добавляй шапку, дату, подпись — только основной текст
- Не добавляй "Уважаемый..." — это будет добавлено автоматически
- Ответ — только текст служебной записки, без пояснений`;
async function formatNewsWithAI(rawContent) {
    try {
        const response = await getClient().chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: NEWS_SYSTEM_PROMPT },
                { role: 'user', content: rawContent },
            ],
            temperature: 0.3,
            max_tokens: 2000,
        });
        const formatted = response.choices[0]?.message?.content?.trim();
        if (!formatted) {
            console.error('AI returned empty response, using original content');
            return rawContent;
        }
        console.log('AI formatted news successfully');
        return formatted;
    }
    catch (error) {
        console.error('AI formatting failed, using original content:', error);
        return rawContent;
    }
}
async function generateMemoText(userRequest) {
    try {
        const response = await getClient().chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: MEMO_SYSTEM_PROMPT },
                { role: 'user', content: userRequest },
            ],
            temperature: 0.4,
            max_tokens: 1500,
        });
        const text = response.choices[0]?.message?.content?.trim();
        if (!text) {
            console.error('AI returned empty memo text');
            return userRequest;
        }
        console.log('AI generated memo text successfully');
        return text;
    }
    catch (error) {
        console.error('AI memo generation failed, using original text:', error);
        return userRequest;
    }
}
//# sourceMappingURL=aiFormatter.js.map