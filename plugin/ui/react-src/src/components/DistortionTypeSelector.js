import React, { useState, useEffect } from 'react';
import { getChoiceState } from '../juceUtils';

const DistortionTypeSelector = () => {
  const [distortionType, setDistortionType] = useState(0);
  const distortionOptions = ["None", "Tanh", "Sigmoid"];
  
  useEffect(() => {
    // Initialize connection to JUCE parameter when component mounts
    const distortionState = getChoiceState("DISTORTION_TYPE");
    if (distortionState) {
      // Set initial value
      setDistortionType(distortionState.getIndex());
      
      // Listen for changes from the plugin
      distortionState.valueChangedEvent.addListener(() => {
        setDistortionType(distortionState.getIndex());
      });
      
      // Cleanup listener on unmount
      return () => {
        distortionState.valueChangedEvent.removeAllListeners();
      };
    }
  }, []);
  
  const handleDistortionChange = (e) => {
    const newIndex = parseInt(e.target.value, 10);
    setDistortionType(newIndex);
    
    // Update the JUCE parameter
    const distortionState = getChoiceState("DISTORTION_TYPE");
    if (distortionState) {
      distortionState.setIndex(newIndex);
    }
  };
  
  return (
    <div className="control">
      <div className="control-header">
        <h3 className="control-title">Distortion Type</h3>
      </div>
      <select value={distortionType} onChange={handleDistortionChange}>
        {distortionOptions.map((option, index) => (
          <option key={index} value={index}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DistortionTypeSelector;