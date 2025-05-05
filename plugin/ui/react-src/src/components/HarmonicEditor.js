import React, { useState, useCallback, useEffect } from 'react';
import BarEditor from './BarEditor';

/**
 * Harmonic Editor component using the BarEditor for adjusting harmonic amplitudes
 * @param {Object} props
 * @param {string} props.title - Title of the control
 * @param {number} props.numHarmonics - Number of harmonics to display
 * @param {function} props.onHarmonicsChange - Callback when harmonic values change
 * @param {number} props.rootNote - MIDI note number of the root note (default: 60 = C4)
 */
const HarmonicEditor = ({ 
  title = "Harmonic Editor", 
  numHarmonics = 16,
  onHarmonicsChange = () => {},
  rootNote = 60 
}) => {
  // Initial harmonic values - fundamental is strongest, rest decrease
  const [harmonics, setHarmonics] = useState(() => {
    return Array(numHarmonics).fill(0).map((_, i) => {
      // First harmonic (fundamental) starts at 80%, then exponential fall-off
      return Math.max(5, Math.floor(80 * Math.pow(0.75, i)));
    });
  });
  
  // Format harmonic value for display
  const formatHarmonicValue = (index, value) => {
    // Get the frequency of this harmonic
    // Harmonic index 0 = fundamental, 1 = 2nd harmonic (2x freq), etc.
    const harmonicNumber = index + 1;
    
    // Calculate frequency: fundamental frequency * harmonic number
    // A4 (MIDI note 69) = 440Hz, each semitone is the 12th root of 2
    const fundamentalFreq = 440 * Math.pow(2, (rootNote - 69) / 12);
    const harmonicFreq = fundamentalFreq * harmonicNumber;
    
    // Get note name of this harmonic if possible
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const semitones = Math.round(12 * Math.log2(harmonicNumber));
    const noteIndex = (rootNote + semitones) % 12;
    const octave = Math.floor((rootNote + semitones) / 12);
    const noteName = noteNames[noteIndex] + octave;
    
    return {
      harmonicNumber: harmonicNumber,
      frequency: harmonicFreq < 1000 
        ? `${harmonicFreq.toFixed(1)}Hz` 
        : `${(harmonicFreq/1000).toFixed(2)}kHz`,
      amplitude: `${value}%`,
      note: noteName
    };
  };
  
  // Send harmonic values to JUCE backend whenever they change
  useEffect(() => {
    // Send to JUCE using the nativeFunction
    if (typeof window.Juce !== 'undefined') {
      window.Juce.callNativeFunction("updateHarmonics", ["updateHarmonics", harmonics], (result) => {
        console.log("Harmonic values sent to plugin:", result);
      });
    }
  }, [harmonics]);
  
  // Handle harmonic value changes
  const handleHarmonicsChange = useCallback((newHarmonics) => {
    setHarmonics(newHarmonics);
    onHarmonicsChange(newHarmonics);
  }, [onHarmonicsChange]);
  
  // Get the currently selected harmonic value
  const [selectedHarmonic, setSelectedHarmonic] = useState(null);
  
  return (
    <div className="control harmonic-editor-control">
      <div className="control-header">
        <h3 className="control-title">{title}</h3>
        {selectedHarmonic !== null && (
          <span className="control-value">
            {formatHarmonicValue(selectedHarmonic, harmonics[selectedHarmonic]).harmonicNumber}° - 
            {formatHarmonicValue(selectedHarmonic, harmonics[selectedHarmonic]).note} - 
            {formatHarmonicValue(selectedHarmonic, harmonics[selectedHarmonic]).frequency} - 
            {formatHarmonicValue(selectedHarmonic, harmonics[selectedHarmonic]).amplitude}
          </span>
        )}
      </div>
      
      <BarEditor
        numBars={numHarmonics}
        minValue={0}
        maxValue={100}
        initialValues={harmonics}
        onChange={handleHarmonicsChange}
        barColor="#8e44ad" // Purple color for harmonics
        snapToGrid={true}
        gridSize={5}
      />
      
      <div className="harmonic-labels">
        {Array(numHarmonics).fill(0).map((_, index) => (
          <div 
            key={index} 
            className="harmonic-label"
            onMouseEnter={() => setSelectedHarmonic(index)}
            onMouseLeave={() => setSelectedHarmonic(null)}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HarmonicEditor;