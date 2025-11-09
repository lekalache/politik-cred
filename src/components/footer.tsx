import { Shield, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#1E3A8A] text-white py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="w-6 h-6 text-[#DC2626]" />
            <span className="text-lg font-semibold">Politik Cred'</span>
          </div>
          <p className="text-gray-300 text-sm">
            Il est crédible lui ? - La vérité sans filtre, la science sans langue de bois
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Version Beta - Street Science Platform
          </p>

          {/* Data Sources Attribution */}
          <div className="mt-6 pt-6 border-t border-gray-600">
            <p className="text-gray-400 text-xs mb-3">
              Données vérifiées par sources multiples :
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <a
                href="https://www.vigiedumensonge.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#DC2626] transition-colors inline-flex items-center gap-1"
              >
                <span>Vigie du mensonge</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-gray-600">•</span>
              <a
                href="https://www.assemblee-nationale.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <span>Assemblée Nationale</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-gray-600">•</span>
              <span className="text-gray-300">IA sémantique Politik Cred&apos;</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
