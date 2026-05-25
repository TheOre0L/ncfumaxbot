import { pool } from '../database';
import { Employee, EmployeeFIO } from '../types/employee';

export async function registerEmployee(employee: Employee): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO employees (max_user_id, last_name, first_name, middle_name, position, department, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (max_user_id) DO UPDATE SET
         last_name = EXCLUDED.last_name,
         first_name = EXCLUDED.first_name,
         middle_name = EXCLUDED.middle_name,
         position = EXCLUDED.position,
         department = EXCLUDED.department,
         phone = EXCLUDED.phone
       RETURNING id`,
      [
        employee.max_user_id,
        employee.last_name,
        employee.first_name,
        employee.middle_name || null,
        employee.position || null,
        employee.department || null,
        employee.phone || null,
      ]
    );
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Error registering employee:', error);
    return false;
  } finally {
    client.release();
  }
}

export async function getEmployeeByUserId(maxUserId: number): Promise<Employee | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM employees WHERE max_user_id = $1',
      [maxUserId]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export function getEmployeeFIO(employee: Employee): EmployeeFIO {
  const firstInitial = employee.first_name.charAt(0);
  const middleInitial = employee.middle_name ? employee.middle_name.charAt(0) + '.' : '';
  const short = `${employee.last_name} ${firstInitial}.${middleInitial}`;
  const full = `${employee.last_name} ${employee.first_name}${employee.middle_name ? ' ' + employee.middle_name : ''}`;
  const namePatronymic = `${employee.first_name}${employee.middle_name ? ' ' + employee.middle_name : ''}`;

  return { short, full, namePatronymic };
}
