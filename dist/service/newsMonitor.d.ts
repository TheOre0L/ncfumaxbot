import { Bot } from '@maxhub/max-bot-api';
export declare class NewsMonitor {
    private parser;
    private bot;
    private chatId;
    private isRunning;
    constructor(baseUrl: string, bot: Bot, chatId: number);
    start(): Promise<void>;
    private checkAndSaveNews;
    private publishUnpublishedNews;
    private publishToChannel;
}
//# sourceMappingURL=newsMonitor.d.ts.map