export interface Employee {
  id?: number;
  max_user_id: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  position?: string;
  department?: string;
  phone?: string;
  created_at?: Date;
}

export interface EmployeeFIO {
  /** Фамилия И.О. (например: Павленко А.Э.) */
  short: string;
  /** Полное ФИО (например: Павленко Андрей Эдуардович) */
  full: string;
  /** Имя Отчество (например: Андрей Эдуардович) */
  namePatronymic: string;
}
