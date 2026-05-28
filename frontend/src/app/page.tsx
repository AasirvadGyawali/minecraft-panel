export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Minecraft Panel
        </h1>

        <p className="text-gray-400 text-lg">
          Your free Minecraft hosting panel
        </p>

        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Get Started
          </a>

          <a
            href="/dashboard"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}