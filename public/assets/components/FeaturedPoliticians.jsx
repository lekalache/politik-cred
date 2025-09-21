import React from 'react';

const FeaturedPoliticians = () => {
  return (
    <section className="py-16 bg-[#FAFAFA]">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-[#1E3A8A]">
          Qui dit vrai lauiss ? 🎯
        </h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Lecornu Video */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <video
              className="w-full h-64 object-cover"
              controls
              poster="/assets/politicians/lecornu.png"
            >
              <source src="/assets/animations/lecornu.mp4" type="video/mp4" />
            </video>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#1E3A8A]">Sébastien Lecornu</h3>
              <p className="text-gray-600">Ministre des Armées</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl">🏆</span>
                <span className="font-bold text-[#059669]">Déjà stressé lauiss !</span>
                <span className="text-xl font-bold">??/100</span>
              </div>
            </div>
          </div>

          {/* Le Pen Video */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <video
              className="w-full h-64 object-cover"
              controls
              poster="/assets/politicians/lepen.jpeg"
            >
              <source src="/assets/animations/lepen.mp4" type="video/mp4" />
            </video>
            <div className="p-6">
              <h3 className="text-xl font-bold text-[#7C2D12]">Marine Le Pen</h3>
              <p className="text-gray-600">Députée RN</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl">⚖️</span>
                <span className="font-bold text-[#D97706]">Moyen la celle...</span>
                <span className="text-xl font-bold">?? /100</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPoliticians;