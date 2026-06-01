import { Employee, EmployeeFIO } from '../types/employee';
export declare function registerEmployee(employee: Employee): Promise<boolean>;
export declare function getEmployeeByUserId(maxUserId: number): Promise<Employee | null>;
export declare function getEmployeeFIO(employee: Employee): EmployeeFIO;
//# sourceMappingURL=employeeService.d.ts.map