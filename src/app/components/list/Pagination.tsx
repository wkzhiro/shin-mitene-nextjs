import Link from "next/link";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  filter: string;
};

export default function Pagination({ currentPage, totalPages, filter }: PaginationProps) {
  const pages: number[] = [];
  if (totalPages <= 3) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage === 1) {
      pages.push(1, 2, 3);
    } else if (currentPage === totalPages) {
      pages.push(totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(currentPage - 1, currentPage, currentPage + 1);
    }
  }

  return (
    <nav className="mt-10">
      <ul className="flex justify-center space-x-4">
        {currentPage > 1 && (
          <li>
            <Link
              href={`/list?page=${currentPage - 1}&filter=${filter}`}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Previous
            </Link>
          </li>
        )}
        {pages.map((p) => (
          <li key={p}>
            {p === currentPage ? (
              <span className="px-4 py-2 bg-blue-500 text-white rounded-lg">{p}</span>
            ) : (
              <Link
                href={`/list?page=${p}&filter=${filter}`}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {p}
              </Link>
            )}
          </li>
        ))}
        {currentPage < totalPages && (
          <li>
            <Link
              href={`/list?page=${currentPage + 1}&filter=${filter}`}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Next
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
