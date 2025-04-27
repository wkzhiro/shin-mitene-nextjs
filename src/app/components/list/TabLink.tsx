import Link from "next/link";

export type TabLinkProps = {
  label: string;
  value: string;
  filter: string;
};

export default function TabLink({ label, value, filter }: TabLinkProps) {
  const isActive = filter === value;
  return (
    <Link
      href={`/list?filter=${value}`}
      className={`py-2 px-4 ${
        isActive
          ? "border-b-2 border-blue-500 text-blue-500 font-bold"
          : "text-gray-500 hover:text-blue-500"
      }`}
    >
      {label}
    </Link>
  );
}
