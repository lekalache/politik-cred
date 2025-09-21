import React from 'react';

const PoliticiansGallery = ({ politicians }) => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-12 text-[#1E3A8A]">
          Le Palmarès POLITIKCRED 🏆
        </h2>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {politicians.map((politician, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg overflow-hidden border-l-4 hover:shadow-xl transition-shadow"
              style={{ borderColor: politician.card_color }}
            >
              <img
                src={politician.image}
                alt={politician.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{politician.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{politician.party}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg">
                    {politician.credibility_score >= 80 ? '🏆' :
                     politician.credibility_score >= 60 ? '⚖️' : '⚠️'}
                  </span>
                  <span className="text-sm font-bold" style={{ color: politician.card_color }}>
                    {politician.credibility_label}
                  </span>
                  <span className="font-bold text-lg">
                    {politician.credibility_score}/100
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PoliticiansGallery;