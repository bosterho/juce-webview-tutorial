import React, { useState } from 'react';
import SliderControl from './components/SliderControl';
import BypassButton from './components/BypassButton';
import DistortionTypeSelector from './components/DistortionTypeSelector';
import HarmonicEditor from './components/HarmonicEditor';
import NoteSelector from './components/NoteSelector';

const App = () => {
  // Function to format pan value display
  const formatPanValue = (value) => {
    if (value < 0.45) return `L ${Math.round((0.5 - value) * 200)}%`;
    if (value > 0.55) return `R ${Math.round((value - 0.5) * 200)}%`;
    return "C";
  };

  // State to keep track of the root note for harmonics
  const [rootNote, setRootNote] = useState(60); // C4 by default

  // Handle harmonic values changes
  const handleHarmonicsChange = (harmonics) => {
    console.log('Harmonic amplitudes changed:', harmonics);
    // Here you would normally update some JUCE parameters
    // or send the data to your audio processing
  };

  return (
    <div className="juce-plugin-ui">
      <header>
        <h1>JUCE Plugin with React</h1>
      </header>
      <main>
        <div className="controls-container">
          <SliderControl 
            paramId="GAIN" 
            title="Gain" 
            className="gain-slider"
          />
          <SliderControl 
            paramId="PAN" 
            title="Pan" 
            formatValue={formatPanValue}
            className="pan-slider"
          />
          <BypassButton />
          <DistortionTypeSelector />
          
          {/* Using our new NoteSelector component */}
          <NoteSelector
            value={rootNote}
            onChange={setRootNote}
            title="Root Note"
            minNote={36} // C2
            maxNote={84} // C6
          />
          
          {/* Our Harmonic Editor component */}
          <HarmonicEditor
            title="Harmonic Amplitudes"
            numHarmonics={16}
            onHarmonicsChange={handleHarmonicsChange}
            rootNote={rootNote}
          />
        </div>
      </main>
    </div>
  );
};

export default App;