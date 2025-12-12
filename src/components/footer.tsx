import { Shield, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-brand-blue-dark text-white py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Shield className="w-6 h-6 text-brand-red" />
            <span className="text-lg font-semibold">Politik Cred&apos;</span>
          </div>
          <p className="text-blue-200 text-sm">
            Il est crédible lui ? - La vérité sans filtre, la science sans langue de bois
          </p>
          <p className="text-blue-300/70 text-xs mt-2">
            Version Beta - Street Science Platform
          </p>

          {/* Data Sources Attribution */}
          <div className="mt-6 pt-6 border-t border-blue-700/50">
            <p className="text-blue-300/70 text-xs mb-3">
              Données vérifiées par sources multiples :
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <a
                href="https://www.vigiedumensonge.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-brand-red transition-colors inline-flex items-center gap-1"
              >
                <span>Vigie du mensonge</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-blue-700">•</span>
              <a
                href="https://www.assemblee-nationale.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <span>Assemblée Nationale</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-blue-700">•</span>
              <span className="text-blue-200">IA sémantique Politik Cred&apos;</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
