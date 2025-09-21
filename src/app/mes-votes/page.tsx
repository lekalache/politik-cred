import { MesVotes } from '@/components/mes-votes'
import { Navigation } from '@/components/navigation'

export default function MesVotesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navigation />
      <MesVotes />
    </div>
  )
}