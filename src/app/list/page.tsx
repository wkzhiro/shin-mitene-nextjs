import { Suspense } from "react";
import ListPageClient from "./ListPageClient";

export default function ListPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-6"><p className="text-gray-600">Loading...</p></div>}>
      <ListPageClient />
    </Suspense>
  );
}
