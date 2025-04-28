import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold text-white">Poll App</div>
        <div className="flex space-x-4">
          <Link
            href="/"
            className="rounded px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Polls
          </Link>
          <Link
            href="/groups"
            className="rounded px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Groups
          </Link>
        </div>
      </div>
    </nav>
  );
}
