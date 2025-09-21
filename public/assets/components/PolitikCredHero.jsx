import React from 'react';

const PolitikCredHero = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/assets/backgrounds/hemicycle.png"
      >
        <source src="/assets/backgrounds/animated-hemi.mp4" type="video/mp4" />
        {/* Fallback image */}
        <img
          src="/assets/backgrounds/hemicycle.png"
          alt="Hémicycle"
          className="w-full h-full object-cover"
        />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full text-center text-white">
        <div className="max-w-4xl px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            🔥 POLITIKCRED
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold mb-8">
            Évaluez la crédibilité de vos représentants
          </h2>
          <button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xl md:text-2xl px-8 py-4 rounded-lg font-bold transition-colors">
            Il est crédible lauiss ? 🤔
          </button>
        </div>
      </div>
    </section>
  );
};

export default PolitikCredHero;