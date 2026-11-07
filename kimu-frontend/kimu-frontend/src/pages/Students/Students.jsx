import ResourcePage from '../../components/common/ResourcePage';

const fields = [
  { name: 'fullName', label: 'Full name' },
  { name: 'phone', label: 'Telephone' },
];

const columns = [
  { key: 'registrationNumber', label: 'Student ID' },
  { key: 'fullName', label: 'Name' },
  { key: 'phone', label: 'Telephone' },
  { key: 'registrationDate', label: 'Registered', render: (student) => new Date(student.registrationDate).toLocaleDateString() },
  { key: 'isActive', label: 'Status', render: (student) => student.isActive ? 'Active' : 'Inactive' },
];

export default function Students() {
  return <ResourcePage resourceClassName="kimu-students" title="Students" description="Register students and keep their contact details ready for training attendance." endpoint="/students" fields={fields} columns={columns} statusEndpoint="status" />;
}