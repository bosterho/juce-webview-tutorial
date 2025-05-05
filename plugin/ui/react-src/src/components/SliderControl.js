import React, { useState, useEffect } from 'react';
import { getSliderState } from '../juceUtils';

/**
 * A reusable slider control component for JUCE parameters
 * @param {Object} props - Component props
 * @param {string} props.paramId - JUCE parameter ID
 * @param {string} props.title - Display title for the control
 * @param {function} props.formatValue - Function to format the displayed value
 * @param {string} props.className - CSS class for the slider (default: "slider-control")
 */
const SliderControl = ({ 
  paramId, 
  title, 
  formatValue = (value) => `${(value * 100).toFixed(0)}%`,
  className = "slider-control" 
}) => {
  const [value, setValue] = useState(0.5);
  
  useEffect(() => {
    // Initialize connection to JUCE parameter when component mounts
    const sliderState = getSliderState(paramId);
    if (sliderState) {
      // Set initial value
      setValue(sliderState.getNormalisedValue());
      
      // Listen for changes from the plugin
      sliderState.valueChangedEvent.addListener(() => {
        setValue(sliderState.getNormalisedValue());
      });
      
      // Cleanup listener on unmount
      return () => {
        sliderState.valueChangedEvent.removeAllListeners();
      };
    }
  }, [paramId]);
  
  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setValue(newValue);
    
    // Update the JUCE parameter
    const sliderState = getSliderState(paramId);
    if (sliderState) {
      sliderState.setNormalisedValue(newValue);
    }
  };
  
  return (
    <div className="control">
      <div className="control-header">
        <h3 className="control-title">{title}</h3>
        <span className="control-value">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        className={className}
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default SliderControl;