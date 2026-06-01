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
export declare function generateMemo(data: MemoData): Promise<Buffer>;
//# sourceMappingURL=memoGenerator.d.ts.map