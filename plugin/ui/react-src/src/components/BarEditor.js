import React, { useState, useRef, useEffect } from 'react';

/**
 * A component for drawing vertical bars that snap to the cursor position
 * @param {Object} props
 * @param {number} props.numBars - Number of bars in the editor
 * @param {number} props.minValue - Minimum value (bottom of bars)
 * @param {number} props.maxValue - Maximum value (potential top of bars)
 * @param {Array<number>} props.initialValues - Starting values for bars
 * @param {function} props.onChange - Callback when values change
 * @param {string} props.barColor - Color of the bars
 * @param {boolean} props.snapToGrid - Whether to snap values to a grid
 * @param {number} props.gridSize - Size of the grid if snapToGrid is true
 */
const BarEditor = ({
  numBars = 16,
  minValue = 0,
  maxValue = 100,
  initialValues = [],
  onChange = () => {},
  barColor = '#3498db',
  snapToGrid = false,
  gridSize = 10
}) => {
  // Initialize values to either provided initialValues or all zeros
  const [values, setValues] = useState(() => {
    if (initialValues.length === numBars) {
      return [...initialValues];
    }
    return Array(numBars).fill(minValue);
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  
  // Update values when props change
  useEffect(() => {
    if (initialValues.length === numBars) {
      setValues([...initialValues]);
    }
  }, [initialValues, numBars]);
  
  // Calculate bar width based on number of bars
  const getBarWidth = () => {
    if (!containerRef.current) return 0;
    return containerRef.current.clientWidth / numBars;
  };
  
  // Helper function to get bar index from mouse position
  const getBarIndexFromPosition = (clientX) => {
    if (!containerRef.current) return -1;
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const barWidth = getBarWidth();
    
    return Math.max(0, Math.min(numBars - 1, Math.floor(relativeX / barWidth)));
  };
  
  // Helper function to get value from mouse position
  const getValueFromPosition = (clientY) => {
    if (!containerRef.current) return minValue;
    
    const rect = containerRef.current.getBoundingClientRect();
    const height = rect.height;
    const relativeY = clientY - rect.top;
    
    // Invert Y coordinate (bottom = minValue, top = maxValue)
    const valueRange = maxValue - minValue;
    let value = maxValue - (relativeY / height) * valueRange;
    
    // Apply grid snapping if enabled
    if (snapToGrid && gridSize > 0) {
      value = Math.round(value / gridSize) * gridSize;
    }
    
    return Math.max(minValue, Math.min(maxValue, value));
  };
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    updateBarValue(e.clientX, e.clientY);
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updateBarValue(e.clientX, e.clientY);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  const updateBarValue = (clientX, clientY) => {
    const barIndex = getBarIndexFromPosition(clientX);
    if (barIndex < 0) return;
    
    const newValue = getValueFromPosition(clientY);
    
    // Update the value at this index
    const newValues = [...values];
    newValues[barIndex] = newValue;
    setValues(newValues);
    
    // Call onChange callback with new values
    onChange(newValues);
  };
  
  // Calculate bar height as percentage of total range
  const getBarHeight = (value) => {
    const valueRange = maxValue - minValue;
    return ((value - minValue) / valueRange) * 100;
  };
  
  return (
    <div className="bar-editor-container">
      <div 
        ref={containerRef}
        className="bar-editor"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {values.map((value, index) => (
          <div 
            key={index} 
            className="bar"
            style={{
              height: `${getBarHeight(value)}%`,
              backgroundColor: barColor,
              width: `calc(${100 / numBars}% - 4px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BarEditor;