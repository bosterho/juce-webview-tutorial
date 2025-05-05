import React, { useState, useEffect } from 'react';
import { getToggleState } from '../juceUtils';

const BypassButton = () => {
  const [bypassed, setBypassed] = useState(false);
  
  useEffect(() => {
    // Initialize connection to JUCE parameter when component mounts
    const bypassToggleState = getToggleState("BYPASS");
    if (bypassToggleState) {
      // Set initial value
      setBypassed(bypassToggleState.getValue());
      
      // Listen for changes from the plugin
      bypassToggleState.valueChangedEvent.addListener(() => {
        setBypassed(bypassToggleState.getValue());
      });
      
      // Cleanup listener on unmount
      return () => {
        bypassToggleState.valueChangedEvent.removeAllListeners();
      };
    }
  }, []);
  
  const toggleBypass = () => {
    // Update the JUCE parameter
    const bypassToggleState = getToggleState("BYPASS");
    if (bypassToggleState) {
      bypassToggleState.setValue(!bypassed);
    }
  };
  
  return (
    <div className="control">
      <div className="control-header">
        <h3 className="control-title">Processing</h3>
      </div>
      <button 
        onClick={toggleBypass}
        className={bypassed ? 'active' : ''}
      >
        {bypassed ? 'Bypassed' : 'Active'}
      </button>
    </div>
  );
};

export default BypassButton;