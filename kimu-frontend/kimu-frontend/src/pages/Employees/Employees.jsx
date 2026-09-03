import ResourcePage from '../../components/common/ResourcePage';

const fields = [
  { name: 'fullName', label: 'Full name' },
  { name: 'employeeNumber', label: 'Employee number' },
  { name: 'department', label: 'Department', required: false },
  { name: 'phone', label: 'Phone', required: false },
];
const columns = [
  { key: 'employeeNumber', label: 'Employee no.' },
  { key: 'fullName', label: 'Name' },
  { key: 'department', label: 'Department' },
  { key: 'phone', label: 'Phone' },
  { key: 'isActive', label: 'Status', render: (item) => item.isActive ? 'Active' : 'Inactive' },
];

export default function Employees() {
  return <ResourcePage title="Employees" description="Keep your company directory current for quick, accurate attendance records." endpoint="/employees" fields={fields} columns={columns} />;
}